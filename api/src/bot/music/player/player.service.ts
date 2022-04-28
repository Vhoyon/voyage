import { InformError } from '$/bot/common/error/inform-error';
import { ChannelContext, MessageService } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { sleep } from '$common/utils/funcs';
import { InjectDiscordClient } from '@discord-nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { Player, PlayerOptions, Playlist, Queue, RepeatMode, Song } from 'discord-music-player';
import { Client, Guild, Message, TextChannel } from 'discord.js';
import { ButtonService } from '../services/button.service';
import { HistoryService } from '../services/history.service';
import {
	DynamicPlayerData,
	DynamicPlayerOptions,
	MusicContext,
	PlayerButtonsOptions,
	PlayMusicData,
	PlayMusicOptions,
	PlayMusicQuery,
	PlayPlaylistCallbacks,
	PlaySongCallbacks,
	QueueData,
	SongData,
	VQueue,
} from './player.types';

export enum DynamicPlayerType {
	PINNED = 'Pinned',
	UPDATEABLE = 'Updateable',
}

export enum PlayType {
	ERROR,
	NEW,
	ADD,
}

@Injectable()
export class PlayerService extends Player {
	private readonly logger = new Logger(PlayerService.name);

	constructor(
		@InjectDiscordClient()
		readonly discordClient: Client,
		private readonly env: EnvironmentConfig,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
		private readonly buttonService: ButtonService,
		private readonly historyService: HistoryService,
	) {
		super(discordClient, {
			deafenOnJoin: true,
			leaveOnEnd: true,
			leaveOnEmpty: true,
			timeout: env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000,
		});

		this.on('songFirst', this.createMusicLog);
		this.on('songChanged', this.createMusicLog);

		this.on('songChanged', (queue) => {
			const delay = 500;

			this.updateDynamic(queue, { delay });
		});

		this.on('clientDisconnect', (queue) => {
			this.convertPlayerToHistory(queue);
		});

		this.on('queueEnd', (queue) => {
			this.convertPlayerToHistory(queue);
		});

		this.on('channelEmpty', (queue) => {
			this.clearDynamic(queue);
		});

		this.on('error', (error, queue) => {
			const queueData = queue.data as QueueData;

			/** Error string to message mapping. */
			const errorMap: Record<string, string> = {
				'Status code: 410': `Couldn't play the given query. If you used a link, make sure the video / playlist is not private or age restricted!`,
				'Status code: 403': `A forbidden error happened while trying to load the given query. Either try again or find another source!`,
			};

			if (queueData.textChannel) {
				const errorMessage = errorMap[error] ?? `An unexpected error happened in the music player...`;

				this.messageService.sendError(queueData.textChannel, errorMessage);
			}

			if (!errorMap[error]) {
				this.logger.error(`Error: "${error}" in guild named "${queue.guild.name}"`);
			}
		});
	}

	/** @inheritdoc */
	override getQueue(guildId: string): VQueue | undefined {
		return super.getQueue(guildId) as VQueue;
	}

	/** @inheritdoc */
	override createQueue(guildId: string, options: PlayerOptions & { data: QueueData }): VQueue {
		return super.createQueue(guildId, options) as VQueue;
	}

	async convertPlayerToHistory(queue: Queue) {
		const vQueue = queue as VQueue;

		if (!vQueue.data.playerMessage) {
			return;
		}

		const historyWidget = await this.buttonService.createHistoryWidget(vQueue.data.history);

		try {
			const message = await this.messageService.edit(vQueue.data.playerMessage, historyWidget);

			this.historyService.setHistoryMessage(vQueue.data.playerMessage.channel as TextChannel, message);
		} catch (error) {
			// do nothing if error happens
		}

		vQueue.data.playerMessage = undefined;

		await this.clearDynamic(queue);
	}

	async setPlayerMessage(message: Message, options?: DynamicPlayerOptions) {
		const queue = this.getQueueOf(message);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Cannot set the player message of an inexistant queue!`);
		}

		queue.data.playerMessage = message;

		if (options?.type) {
			await this.setDynamic(message, { type: options.type });
		}
	}

	getQueueOf(of: MusicContext) {
		if (of instanceof Queue) {
			return of as VQueue;
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

		let finalQueue: VQueue;

		if (queue) {
			finalQueue = queue;
		} else {
			finalQueue = this.createQueue(guild.id, {
				data: {
					textChannel,
				},
			});
		}

		return { queue: finalQueue, musicSettings: guildMusicSettings, isNewQueue: !queue };
	}

	isPlaying(context: MusicContext) {
		const queue = this.getQueueOf(context);

		return this.hasQueueAndPlaying(queue);
	}

	isQueuePlaying(queue: Queue): queue is Queue & { nowPlaying: Song } {
		return !!queue.nowPlaying;
	}

	hasQueueAndPlaying(queue: VQueue | null | undefined): queue is VQueue & { nowPlaying: Song } {
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

		queue.leave();

		return true;
	}

	createNowPlayingWidget(context: MusicContext, options?: PlayerButtonsOptions) {
		const queue = this.getQueueOf(context);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Nothing is currently playing!`);
		}

		return this.buttonService.createNowPlayingWidget(queue, options);
	}

	async play<SongType, PlaylistType>(data: PlayMusicQuery & PlayMusicOptions<SongType, PlaylistType>): Promise<PlayType> {
		const { query, voiceChannel, requester, playOptions, ...options } = data;
		const { queue, musicSettings } = await this.getOrCreateQueueOf(voiceChannel.guild, options?.textChannel);

		const previousPlayerMessage = queue.data.playerMessage;

		if (playOptions?.immediate && !queue.isPlaying) {
			playOptions.immediate = false;
		}

		const playType = await this.playMusic({
			query,
			queue,
			voiceChannel,
			requester,
			volume: musicSettings.volume,
			options,
			playOptions,
		});

		if (playType == PlayType.NEW && queue.data.playerMessage != previousPlayerMessage) {
			previousPlayerMessage?.delete().catch(() => {
				// do nothing if error happens
			});
		}

		return playType;
	}

	protected async playMusic<SongType, PlaylistType>(data: PlayMusicData<SongType, PlaylistType>): Promise<PlayType> {
		await data.queue.join(data.voiceChannel);

		const isQuerySong = !data.query.includes('/playlist');

		if (isQuerySong) {
			return this.playSong(data);
		} else {
			return this.playPlaylist(data);
		}
	}

	protected createSongData(data: SongData): SongData {
		return data;
	}

	protected async playSong<T>(data: PlayMusicData<T, undefined, PlaySongCallbacks<T>>): Promise<PlayType> {
		const { query, queue, volume, requester, options, playOptions } = data;

		let song: Song;

		const searchContext = await options?.onSongSearch?.();

		const hadSongs = queue.songs.length;

		try {
			song = await queue.play(query, {
				requestedBy: requester,
				...playOptions,
			});
		} catch (error) {
			if (searchContext) {
				await options?.onSongSearchError?.(searchContext);
			}

			return PlayType.ERROR;
		}

		song.setData(this.createSongData({ query }));

		if (hadSongs) {
			if (searchContext) {
				await options?.onSongAdd?.(song, searchContext);
			}

			return PlayType.ADD;
		} else {
			queue.setVolume(volume);

			if (searchContext) {
				await options?.onSongPlay?.(song, searchContext);
			}

			return PlayType.NEW;
		}
	}

	protected async playPlaylist<T>(data: PlayMusicData<undefined, T, PlayPlaylistCallbacks<T>>): Promise<PlayType> {
		const { query, queue, volume, requester, options, playOptions } = data;

		let playlist: Playlist;

		const searchContext = await options?.onPlaylistSearch?.();

		const hadSongs = queue.songs.length;

		try {
			playlist = await queue.playlist(query, {
				requestedBy: requester,
				...playOptions,
			});
		} catch (error) {
			if (searchContext) {
				await options?.onPlaylistSearchError?.(searchContext);
			}

			return PlayType.ERROR;
		}

		playlist.songs.forEach((s) => s.setData(this.createSongData({ query })));

		if (hadSongs) {
			if (searchContext) {
				await options?.onPlaylistAdd?.(playlist, searchContext);
			}

			return PlayType.ADD;
		} else {
			queue.setVolume(volume);

			if (searchContext) {
				await options?.onPlaylistPlay?.(playlist, searchContext);
			}

			return PlayType.NEW;
		}
	}

	async setDynamic(message: Message, options?: DynamicPlayerOptions & { context?: ChannelContext }) {
		const queue = this.getQueueOf(message);

		if (!this.hasQueueAndPlaying(queue)) {
			throw new InformError(`Cannot set a dynamic player when there is nothing playing!`);
		}

		const previousPlayerMessage = queue.data.playerMessage;

		if (queue.data.dynamicPlayer && previousPlayerMessage) {
			this.messageService.sendInfo(previousPlayerMessage, `The dynamic player was stopped because another one was created!`);

			await this.clearDynamic(previousPlayerMessage);
		}

		const type = options?.type ?? DynamicPlayerType.UPDATEABLE;
		const delay = options?.delay ?? this.env.DISCORD_PLAYER_UPDATE_INTERVAL;

		const buttonOptions: PlayerButtonsOptions = {
			dynamicPlayerType: type,
		};

		let updater: DynamicPlayerData['updater'];

		let messageToReplace = message;

		switch (type) {
			case DynamicPlayerType.PINNED:
				updater = async () => {
					const npWidget = this.createNowPlayingWidget(queue, buttonOptions);

					const newPlayerMessage = await this.messageService.replace(messageToReplace, npWidget, {
						context: options?.context,
					});

					if (newPlayerMessage) {
						queue.data.playerMessage = newPlayerMessage;

						messageToReplace = newPlayerMessage;
					}
				};
				break;
			case DynamicPlayerType.UPDATEABLE:
			default:
				updater = async () => {
					const npWidget = this.createNowPlayingWidget(queue, buttonOptions);

					await this.messageService.edit(message, npWidget);
				};
				break;
		}

		const interval = setInterval(updater, delay * 1000);

		queue.data.playerMessage = messageToReplace;
		queue.data.dynamicPlayer = { type, interval, updater };
	}

	async updateDynamic(context: MusicContext, options?: Partial<{ delay: number }>) {
		const queue = this.getQueueOf(context);

		if (!queue?.data.dynamicPlayer) {
			return null;
		}

		if (options?.delay) {
			await sleep(options?.delay);
		}

		return queue.data.dynamicPlayer?.updater();
	}

	async clearDynamic(context: MusicContext) {
		const queue = this.getQueueOf(context);

		if (!queue?.data.dynamicPlayer) {
			return null;
		}

		const { interval, type } = queue.data.dynamicPlayer;
		const playerMessage = queue.data.playerMessage;

		clearInterval(interval);

		delete queue.data.dynamicPlayer;

		if (playerMessage) {
			await this.messageService.edit(playerMessage, this.createNowPlayingWidget(queue));
		}

		return type;
	}

	async createMusicLog(badQueue: Queue, song: Song) {
		const queue = badQueue as VQueue;

		if (queue.repeatMode != RepeatMode.SONG) {
			if (!queue.data.history?.length) {
				queue.data.history = [];
			}

			queue.data.history.unshift(song);
		}

		const { name, author, url } = song;

		const guildId = queue.guild.id;

		try {
			await this.prisma.musicLog.create({
				data: {
					name,
					author,
					url,
					requester: song.requestedBy?.id,
					guild: {
						connect: {
							guildId,
						},
					},
				},
			});
		} catch (error) {
			if (queue.data.textChannel) {
				await this.messageService.sendInternalError(
					queue.data.textChannel,
					`Couldn't log the current song to my database, you won't find it in your history :(`,
				);
			}

			this.logger.error(`Error trying to log played music for guild id ${guildId}`);
		}
	}
}
