import { InformError } from '$/bot/common/error/inform-error';
import { ChannelContext, GuildChannelsContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { CallbackResult } from '$common/utils/types';
import { inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Playlist, Queue, RepeatMode, Song } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import {
	EmbedFieldData,
	Guild,
	GuildChannelResolvable,
	InteractionButtonOptions,
	Message,
	MessageActionRow,
	MessageButton,
	StageChannel,
	TextChannel,
	User,
	VoiceChannel,
} from 'discord.js';
import { MusicInteractionConstant } from '../constants/music.constant';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';

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

export type PlayerButtonsOptions = {
	dynamicPlayerType?: DynamicPlayerType;
};

export type PlaySongCallbacks<T> = {
	onSongSearch?: () => CallbackResult<T>;
	onSongSearchError?: (searchContext: T) => CallbackResult<T>;
	onSongPlay?: (searchContext: T, song: Song) => CallbackResult<T>;
	onSongAdd?: (searchContext: T, song: Song) => CallbackResult<T>;
};

export type PlayPlaylistCallbacks<T> = {
	onPlaylistSearch?: () => CallbackResult<T>;
	onPlaylistSearchError?: (searchContext: T) => CallbackResult<T>;
	onPlaylistPlay?: (searchContext: T, playlist: Playlist) => CallbackResult<T>;
	onPlaylistAdd?: (searchContext: T, playlist: Playlist) => CallbackResult<T>;
};

export type PlayMusicCallbacks<SongType, PlaylistType> = PlaySongCallbacks<SongType> & PlayPlaylistCallbacks<PlaylistType>;

export type PlayMusicOptions<SongType, PlaylistType> = PlayMusicCallbacks<SongType, PlaylistType> & {
	/** This allows to setup the queue with the textChannel data property, therefore sending messages on different events. */
	textChannel?: TextChannel;
};

export type PlayMusicData<
	SongType,
	PlaylistType,
	Options extends PlayMusicOptions<SongType, PlaylistType> = PlayMusicOptions<SongType, PlaylistType>,
> = {
	query: string;
	queue: Queue;
	voiceChannel: GuildChannelResolvable;
	volume: number;
	requester: User;
	options?: Options;
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

		let finalQueue: Queue;

		if (queue) {
			finalQueue = queue;
		} else {
			finalQueue = this.createQueue(guild.id, {
				data: {
					textChannel,
				} as QueueData,
			});
		}

		return { queue: finalQueue, musicSettings: guildMusicSettings, isNewQueue: !queue };
	}

	isQueuePlaying(queue: Queue) {
		return !!queue.nowPlaying;
	}

	hasQueueAndPlaying(queue: Queue | null | undefined): queue is Queue {
		const isPlaying = !!queue && this.isQueuePlaying(queue);

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

		if (options?.dynamicPlayerType) {
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
		];

		const queueData = queue.data as QueueData;

		const dynamicPlayerType = options?.dynamicPlayerType ?? queueData.dynamicPlayer?.type;

		if (dynamicPlayerType) {
			fields.push({
				name: 'Dynamic Player Type',
				value: dynamicPlayerType,
				inline: true,
			});
		}

		fields.push({
			name: 'Progress',
			value: inlineCode(progressBar),
		});

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

	async play<SongType, PlaylistType>(
		query: string,
		voiceChannel: VoiceChannel | StageChannel,
		requester: User,
		options?: PlayMusicOptions<SongType, PlaylistType>,
	) {
		const { queue, musicSettings } = await this.getOrCreateQueueOf(voiceChannel.guild, options?.textChannel);

		return this.playMusic({
			query,
			queue,
			voiceChannel,
			requester,
			volume: musicSettings.volume,
			options,
		});
	}

	async playMusic<SongType, PlaylistType>(data: PlayMusicData<SongType, PlaylistType>) {
		await data.queue.join(data.voiceChannel);

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

	protected async playSong<T>({ query, queue, volume, requester, options }: PlayMusicData<T, undefined, PlaySongCallbacks<T>>) {
		let song: Song;

		const searchContext = await options?.onSongSearch?.();

		const hadSongs = queue.songs.length;

		try {
			song = await queue.play(query, {
				requestedBy: requester,
			});
		} catch (error) {
			if (searchContext) {
				await options?.onSongSearchError?.(searchContext);
			}

			return;
		}

		song.setData(this.createSongData(query));

		if (hadSongs) {
			if (searchContext) {
				await options?.onSongAdd?.(searchContext, song);
			}
		} else {
			queue.setVolume(volume);

			(queue.data as QueueData).lastPlayedSong = song;

			if (searchContext) {
				await options?.onSongPlay?.(searchContext, song);
			}
		}
	}

	protected async playPlaylist<T>({ query, queue, volume, requester, options }: PlayMusicData<undefined, T, PlayPlaylistCallbacks<T>>) {
		let playlist: Playlist;

		const searchContext = await options?.onPlaylistSearch?.();

		const hadSongs = queue.songs.length;

		try {
			playlist = await queue.playlist(query, {
				requestedBy: requester,
			});
		} catch (error) {
			if (searchContext) {
				await options?.onPlaylistSearchError?.(searchContext);
			}

			return;
		}

		playlist.songs.forEach((s) => s.setData(this.createSongData(query)));

		if (hadSongs) {
			if (searchContext) {
				await options?.onPlaylistAdd?.(searchContext, playlist);
			}
		} else {
			queue.setVolume(volume);

			(queue.data as QueueData).lastPlayedSong = playlist.songs[0];

			if (searchContext) {
				await options?.onPlaylistPlay?.(searchContext, playlist);
			}
		}
	}

	async setDynamic(message: Message, options?: DynamicPlayerOptions & { context?: ChannelContext }) {
		const queue = this.getQueueOf(message);

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
			dynamicPlayerType: type,
		};

		let updater: () => void;

		let messageToReplace = message;

		switch (type) {
			case DynamicPlayerType.PINNED:
				updater = async () => {
					const newPlayerMessage = await this.messageService.replace(messageToReplace, this.createNowPlayingWidget(queue, buttonOptions), {
						context: options?.context,
					});

					if (newPlayerMessage instanceof Message) {
						if (queueData.dynamicPlayer) {
							queueData.dynamicPlayer.playerMessage = newPlayerMessage;
						}

						messageToReplace = newPlayerMessage;
					}
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

		delete queueData.dynamicPlayer;

		if (playerMessage) {
			await this.messageService.edit(playerMessage, this.createNowPlayingWidget(queue));
		}

		return type;
	}
}
