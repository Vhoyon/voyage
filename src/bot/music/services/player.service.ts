import { InformError } from '$/bot/common/error/inform-error';
import { GuildChannelsContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseMsIntoTime } from '$common/utils/funcs';
import { inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { MusicSetting } from '@prisma/client';
import { Player, Playlist, Queue, RepeatMode, Song } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { EmbedFieldData, Guild, InteractionButtonOptions, Message, MessageActionRow, MessageButton, TextChannel } from 'discord.js';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { MusicInteractionConstant } from '../music.constant';

export type QueueData = {
	textChannel?: TextChannel;
	isPaused?: boolean;
	lastPlayedSong?: Song;
	dynamicPlayer?: DynamicPlayerData;
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export type MusicContext = Guild | GuildChannelsContext | Queue;

export type PlayerButtonsOptions = Partial<{
	showStopDynamicPlayer: boolean;
}>;

export type PlayOptions = {
	sendMessages?: boolean;
	dynamicPlayerOptions?: DynamicPlayerOptions;
};

export type PlayMusicOptions = {
	query: string;
	queue: Queue;
	message: Message;
	botMessage: Message | undefined;
	musicSettings: MusicSetting;
	options?: PlayOptions;
};

export type DynamicPlayerData = {
	type: DynamicPlayerType;
	interval: NodeJS.Timer;
	playerMessage?: Message;
};

export enum DynamicPlayerType {
	UPDATEABLE = 'Updateable',
	PINNED = 'Pinned',
}

export type DynamicPlayerOptions = {
	type?: DynamicPlayerType;
	delay?: number;
};

@Injectable()
export class PlayerService extends Player {
	private readonly logger = new Logger(PlayerService.name);

	constructor(
		readonly discordProvider: DiscordClientProvider,
		private readonly env: EnvironmentConfig,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
	) {
		super(discordProvider.getClient(), {
			deafenOnJoin: true,
			leaveOnEnd: true,
			leaveOnEmpty: true,
			timeout: env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000,
		});

		this.on('songChanged', async (queue, newSong) => {
			try {
				await this.prisma.musicSetting.updateMany({
					data: {
						lastSongPlayed: (newSong.data as SongData).query,
						nbOfSongsPlayed: {
							increment: 1,
						},
					},
					where: {
						guild: {
							guildId: queue.guild.id,
						},
					},
				});
			} catch (error) {
				this.logger.error(error);
			}
		});

		this.on('songChanged', async (queue, _newSong, oldSong) => {
			if (queue.repeatMode != RepeatMode.SONG) {
				(queue.data as QueueData).lastPlayedSong = oldSong;
			}
		});

		this.on('clientDisconnect', (queue) => {
			this.clearDynamic(queue);
		});

		this.on('queueEnd', (queue) => {
			this.clearDynamic(queue);
		});

		this.on('channelEmpty', async (queue) => {
			this.clearDynamic(queue);
		});

		this.on('error', (error, queue) => {
			const queueData = queue.data as QueueData;

			if (queueData.textChannel && error == 'Status code: 410') {
				this.messageService.sendError(
					queueData.textChannel,
					`Couldn't play the given query. If you used a link, make sure the video / playlist is not private or age restricted!`,
				);
			} else {
				this.logger.error(`Error: "${error}" in guild named "${queue.guild?.name}"`);
			}
		});
	}

	getQueueOf(of: MusicContext) {
		if (of instanceof Queue) {
			return of;
		}

		const guild = of instanceof Guild ? of : of.guild;

		return guild && this.getQueue(guild.id);
	}

	async getOrCreateQueueOf(guild: Guild, textChannel?: TextChannel) {
		const queue = this.getQueueOf(guild);

		let guildMusicSettings = await this.prisma.musicSetting.findFirst({
			where: {
				guild: {
					guildId: guild.id,
				},
			},
		});

		if (!guildMusicSettings) {
			guildMusicSettings = await this.prisma.musicSetting.create({
				data: {
					guild: {
						connect: {
							guildId: guild.id,
						},
					},
				},
			});
		}

		const isNewQueue = !queue;

		const finalQueue =
			queue ??
			this.createQueue(guild.id, {
				data: {
					textChannel,
				} as QueueData,
				volume: guildMusicSettings.volume,
			});

		return { queue: finalQueue, musicSettings: guildMusicSettings, isNewQueue };
	}

	hasQueueAndPlaying(queue: Queue | null | undefined): queue is Queue {
		const isPlaying = !!queue?.nowPlaying;

		if (queue) {
			queue.isPlaying = isPlaying;
		}

		return isPlaying;
	}

	async disconnect(context: MusicContext) {
		const queue = this.getQueueOf(context);

		if (!queue) {
			return false;
		}

		await this.clearDynamic(queue);

		queue.destroy(true);

		return true;
	}

	createPlayerButtons(options?: PlayerButtonsOptions) {
		const queueInteractions: Pick<InteractionButtonOptions, 'customId' | 'emoji'>[] = [
			{
				customId: MusicInteractionConstant.LAST_SONG,
				emoji: '⏮',
			},
			{
				customId: MusicInteractionConstant.PLAY_PAUSE,
				emoji: '⏯',
			},
			{
				customId: MusicInteractionConstant.SKIP,
				emoji: '⏩',
			},
		];

		if (options?.showStopDynamicPlayer) {
			queueInteractions.push({
				customId: MusicInteractionConstant.STOP_DYNAMIC_PLAYER,
				emoji: '🛑',
			});
		}

		const queueRow = new MessageActionRow({
			components: queueInteractions.map((interaction) => {
				return new MessageButton({
					style: 'SECONDARY',
					...interaction,
				});
			}),
		});

		const playerInteractions: Pick<InteractionButtonOptions, 'customId' | 'emoji'>[] = [
			{
				customId: MusicInteractionConstant.REPEAT,
				emoji: '🔂',
			},
			{
				customId: MusicInteractionConstant.REPEAT_ALL,
				emoji: '🔁',
			},
			{
				customId: MusicInteractionConstant.DISCONNECT,
				emoji: '⏹',
			},
		];

		const playerRow = new MessageActionRow({
			components: playerInteractions.map((interaction) => {
				return new MessageButton({
					style: 'SECONDARY',
					...interaction,
				});
			}),
		});

		return [queueRow, playerRow];
	}

	createNowPlayingWidget(context: MusicContext, options?: PlayerButtonsOptions) {
		const queue = this.getQueueOf(context);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Nothing is currently playing!`);
		}

		const song = queue.nowPlaying;

		const progressBar = queue.createProgressBar().prettier;

		let repeatMode: string;

		switch (queue.repeatMode) {
			case RepeatMode.SONG:
				repeatMode = 'Looping Song';
				break;
			case RepeatMode.QUEUE:
				repeatMode = 'Looping Queue';
				break;
			case RepeatMode.DISABLED:
			default:
				repeatMode = 'Disabled';
				break;
		}

		const playerButtons = this.createPlayerButtons(options);

		const fields: EmbedFieldData[] = [
			{
				name: 'Requester',
				value: song.requestedBy!.tag,
				inline: true,
			},
			{
				name: 'Author',
				value: inlineCode(song.author),
				inline: true,
			},
			{
				name: 'Remaining songs',
				value: queue.songs.length.toString(),
				inline: true,
			},
			{
				name: 'Repeat Mode',
				value: repeatMode,
				inline: true,
			},
			{
				name: 'Volume',
				value: `${queue.volume}/${VOLUME_MAXIMUM}`,
				inline: true,
			},
			{
				name: 'Progress',
				value: inlineCode(progressBar),
			},
		];

		const queueData = queue.data as QueueData;

		if (queueData.dynamicPlayer?.type) {
			fields.push({
				name: 'Dynamic Player Type',
				value: queueData.dynamicPlayer.type,
			});
		}

		return {
			title: `Now playing : ${inlineCode(song.name)}!`,
			thumbnail: {
				url: song.thumbnail,
			},
			components: [...playerButtons],
			fields,
			url: song.url,
		} as SendableOptions;
	}

	async playMusic(data: PlayMusicOptions) {
		const isQuerySong = !data.query.includes('/playlist');

		if (isQuerySong) {
			await this.playSong(data);
		} else {
			await this.playPlaylist(data);
		}
	}

	protected createSongData(query: string): SongData {
		return {
			query,
		};
	}

	protected async playSong({ query, queue, message, botMessage, musicSettings, options }: PlayMusicOptions) {
		let song: Song;

		try {
			song = await queue.play(query, {
				requestedBy: message.author,
			});
		} catch (error) {
			if (botMessage) {
				await this.messageService.replace(
					message,
					botMessage,
					`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video is not private!`,
					'error',
				);
			}

			return;
		}

		song.setData(this.createSongData(query));

		const hadSongs = queue.songs.length;

		if (hadSongs) {
			if (botMessage) {
				const playerButtons = this.createPlayerButtons();

				await this.messageService.replace(message, botMessage, {
					title: `Added song ${inlineCode(song.name)} to the queue!`,
					thumbnail: {
						url: song.thumbnail,
					},
					fields: [
						{
							name: 'Author',
							value: inlineCode(song.author),
							inline: true,
						},
						{
							name: 'Duration',
							value: inlineCode(song.duration),
							inline: true,
						},
						{
							name: 'Volume',
							value: `${musicSettings.volume}/${VOLUME_MAXIMUM}`,
							inline: true,
						},
					],
					url: song.url,
					components: [...playerButtons],
				});
			}
		} else {
			(queue.data as QueueData).lastPlayedSong = song;

			if (botMessage) {
				const nowPlayingWidget = this.createNowPlayingWidget(queue, {
					showStopDynamicPlayer: !!options?.dynamicPlayerOptions?.type,
				});
				const playerMessage = await this.messageService.replace(message, botMessage, nowPlayingWidget);

				if (options?.dynamicPlayerOptions?.type) {
					await this.setDynamic(queue, playerMessage, options?.dynamicPlayerOptions);
				}
			}
		}
	}

	protected async playPlaylist({ query, queue, message, botMessage, musicSettings, options }: PlayMusicOptions) {
		let playlist: Playlist;

		try {
			playlist = await queue.playlist(query, {
				requestedBy: message.author,
			});
		} catch (error) {
			if (botMessage) {
				await this.messageService.replace(
					message,
					botMessage,
					`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the playlist is not private!`,
					'error',
				);
			}

			return;
		}

		playlist.songs.forEach((s) => s.setData(this.createSongData(query)));

		const hadSongs = queue.songs.length;

		if (hadSongs) {
			if (botMessage) {
				const playerButtons = this.createPlayerButtons();

				const totalDuration = playlist.songs.reduce((acc, song) => acc + song.millisecons, 0);
				const formattedTotalDuration = parseMsIntoTime(totalDuration);

				await this.messageService.replace(message, botMessage, {
					title: `Added playlist ${inlineCode(playlist.name)}!`,
					fields: [
						{
							name: 'Songs Count',
							value: inlineCode(playlist.songs.length.toString()),
							inline: true,
						},
						{
							name: 'Total Duration',
							value: inlineCode(formattedTotalDuration),
							inline: true,
						},
						{
							name: 'Volume',
							value: `${musicSettings.volume}/${VOLUME_MAXIMUM}`,
							inline: true,
						},
					],
					url: playlist.url,
					components: [...playerButtons],
				});
			}
		} else {
			(queue.data as QueueData).lastPlayedSong = playlist.songs[0];

			if (botMessage) {
				const nowPlayingWidget = this.createNowPlayingWidget(queue, {
					showStopDynamicPlayer: !!options?.dynamicPlayerOptions?.type,
				});

				const playerMessage = await this.messageService.replace(message, botMessage, nowPlayingWidget);

				if (options?.dynamicPlayerOptions?.type) {
					await this.setDynamic(queue, playerMessage, options?.dynamicPlayerOptions);
				}
			}
		}
	}

	async setDynamic(context: MusicContext, message: Message, options?: DynamicPlayerOptions) {
		const queue = this.getQueueOf(context);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Cannot set a dynamic player when there is nothing playing!`);
		}

		const queueData = queue.data as QueueData;

		const previousPlayerMessage = queueData.dynamicPlayer?.playerMessage;

		if (previousPlayerMessage) {
			this.messageService.sendInfo(previousPlayerMessage, `The dynamic player was stopped because another one was created!`);

			await this.clearDynamic(previousPlayerMessage);
		}

		const type = options?.type ?? DynamicPlayerType.UPDATEABLE;
		const delay = options?.delay ?? this.env.DISCORD_PLAYER_UPDATE_INTERVAL;

		const buttonOptions: PlayerButtonsOptions = {
			showStopDynamicPlayer: true,
		};

		let updater: () => void;

		const channel = message.channel;
		let messageToReplace = message;

		switch (type) {
			case DynamicPlayerType.PINNED:
				updater = async () => {
					const newPlayerMessage = await this.messageService.replace(
						channel,
						messageToReplace,
						this.createNowPlayingWidget(queue, buttonOptions),
					);

					if (queueData.dynamicPlayer) {
						queueData.dynamicPlayer.playerMessage = newPlayerMessage;
					}

					messageToReplace = newPlayerMessage;
				};
				break;
			case DynamicPlayerType.UPDATEABLE:
			default:
				updater = async () => {
					await this.messageService.edit(message, this.createNowPlayingWidget(queue, buttonOptions));
				};
				break;
		}

		const interval = setInterval(updater, delay * 1000);

		queueData.dynamicPlayer = { type, interval, playerMessage: messageToReplace };
	}

	async clearDynamic(context: MusicContext) {
		const queue = this.getQueueOf(context);

		const queueData = queue?.data as QueueData | undefined;

		if (!queue || !queueData?.dynamicPlayer) {
			return null;
		}

		const { interval, type, playerMessage } = queueData.dynamicPlayer!;

		clearInterval(interval);

		if (playerMessage) {
			await this.messageService.edit(playerMessage, this.createNowPlayingWidget(queue));
		}

		delete queueData.dynamicPlayer;

		return type;
	}
}
