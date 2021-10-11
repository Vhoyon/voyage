import { InformError } from '$/bot/common/error/inform-error';
import { GuildChannelsContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Queue, RepeatMode, Song } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { EmbedFieldData, InteractionButtonOptions, Message, MessageActionRow, MessageButton, TextChannel } from 'discord.js';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { MusicInteractionConstant } from '../music.constant';

export type QueueData = {
	textChannel: TextChannel;
	isPaused?: boolean;
	lastPlayedSong?: Song;
	dynamicPlayer?: DynamicPlayerData;
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export type MusicContext = GuildChannelsContext | Queue;

export type PlayerButtonsOptions = Partial<{
	showStopDynamicPlayer: boolean;
}>;

export type DynamicPlayerData = {
	type: DynamicPlayerType;
	interval: NodeJS.Timer;
	playerMessage?: Message;
};

export enum DynamicPlayerType {
	UPDATEABLE = 'Updateable',
	PINNED = 'Pinned',
}

export type DynamicPlayerOptions = Partial<{
	type: DynamicPlayerType;
	delay: number;
}>;

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
			if (typeof error == 'string') {
				if (error == 'Status code: 410') {
					this.messageService.sendError(
						(queue.data as QueueData).textChannel,
						`Couldn't play the given query. If you used a link, make sure the video / playlist is not private or age restricted!`,
					);
				} else {
					this.logger.error(`Error: "${error}" in guild named "${queue.guild?.name}"`);
				}
			}
		});
	}

	getQueueOf(of: MusicContext) {
		if (of instanceof Queue) {
			return of;
		}

		return of.guild && this.getQueue(of.guild.id);
	}

	async getOrCreateQueueOf(message: Message) {
		const queue = this.getQueueOf(message);

		if (!message.guild) {
			throw new InformError(`I can't play music from this channel! Make sure to be in a server.`);
		}

		let guildMusicSettings = await this.prisma.musicSetting.findFirst({
			where: {
				guild: {
					guildId: message.guild.id,
				},
			},
		});

		if (!guildMusicSettings) {
			guildMusicSettings = await this.prisma.musicSetting.create({
				data: {
					guild: {
						connect: {
							guildId: message.guild.id,
						},
					},
				},
			});
		}

		const isNewQueue = !queue;

		const finalQueue =
			queue ??
			this.createQueue(message.guild.id, {
				data: {
					textChannel: message.channel,
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

		if ((queue.data as QueueData).dynamicPlayer?.type) {
			fields.push({
				name: 'Dynamic Player Type',
				value: (queue.data as QueueData).dynamicPlayer!.type,
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

	async setDynamic(context: MusicContext, message: Message, options?: DynamicPlayerOptions) {
		const queue = this.getQueueOf(context);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Cannot set a dynamic player when there is nothing playing!`);
		}

		const previousPlayerMessage = (queue.data as QueueData).dynamicPlayer?.playerMessage;

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

					if ((queue.data as QueueData).dynamicPlayer) {
						(queue.data as QueueData).dynamicPlayer!.playerMessage = newPlayerMessage;
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

		(queue.data as QueueData).dynamicPlayer = { type, interval, playerMessage: messageToReplace };
	}

	async clearDynamic(context: MusicContext) {
		const queue = this.getQueueOf(context);

		if (!queue || !(queue.data as QueueData).dynamicPlayer) {
			return null;
		}

		const { interval, type, playerMessage } = (queue.data as QueueData).dynamicPlayer!;

		clearInterval(interval);

		if (playerMessage) {
			await this.messageService.edit(playerMessage, this.createNowPlayingWidget(queue));
		}

		delete (queue.data as QueueData).dynamicPlayer;

		return type;
	}
}
