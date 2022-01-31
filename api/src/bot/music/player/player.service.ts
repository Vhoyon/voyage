import { InformError } from '$/bot/common/error/inform-error';
import { ChannelContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { sleep } from '$common/utils/funcs';
import { DiscordClientProvider } from '@discord-nestjs/core';
import { inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Player, PlayerOptions, Playlist, Queue, RepeatMode, Song } from 'discord-music-player';
import { EmbedFieldData, Guild, Message, MessageActionRow, MessageButton, StageChannel, TextChannel, User, VoiceChannel } from 'discord.js';
import { MusicInteractionConstant, PartialInteractionButtonOptions } from '../constants/music.constant';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import {
	DynamicPlayerData,
	DynamicPlayerOptions,
	MusicContext,
	PlayerButtonsOptions,
	PlayMusicData,
	PlayMusicOptions,
	PlayPlaylistCallbacks,
	PlaySongCallbacks,
	QueueData,
	SongData,
	VQueue,
} from './player.types';

export enum DynamicPlayerType {
	UPDATEABLE = 'Updateable',
	PINNED = 'Pinned',
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

		this.on('songChanged', async (queue, newSong, _oldSong) => {
			const queueData = queue.data as QueueData;

			if (queue.repeatMode != RepeatMode.SONG) {
				queueData.history!.push(newSong);
			}

			const loadingSongDelay = 500;

			await sleep(loadingSongDelay);

			this.updateDynamic(queue);
		});

		this.on('clientDisconnect', async (queue) => {
			this.clearDynamic(queue);

			const timeout = this.env.DISCORD_INTERACTION_MESSAGE_TIMEOUT;

			await sleep(timeout * 1000);

			const queueData = queue.data as QueueData;

			try {
				await queueData.playerMessage?.delete();
			} catch (error) {
				// do nothing if error happens
			}
		});

		this.on('queueEnd', (queue) => {
			this.clearDynamic(queue);
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
		this.emit('clientDisconnect', queue);

		return true;
	}

	createButton(options: PartialInteractionButtonOptions) {
		return new MessageButton({
			style: 'SECONDARY',
			...options,
		});
	}

	createPlayerButtons(options?: PlayerButtonsOptions) {
		const queueInteractions: PartialInteractionButtonOptions[] = [
			MusicInteractionConstant.REWIND,
			MusicInteractionConstant.PLAY_PAUSE,
			MusicInteractionConstant.SKIP,
		];

		if (options?.dynamicPlayerType) {
			queueInteractions.push(MusicInteractionConstant.STOP_DYNAMIC_PLAYER);
		}

		const queueRow = new MessageActionRow({
			components: queueInteractions.map((interaction) => {
				return this.createButton(interaction);
			}),
		});

		const playerInteractions: PartialInteractionButtonOptions[] = [
			MusicInteractionConstant.REPEAT,
			MusicInteractionConstant.REPEAT_ALL,
			MusicInteractionConstant.DISCONNECT,
		];

		const playerRow = new MessageActionRow({
			components: playerInteractions.map((interaction) => {
				return this.createButton(interaction);
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

		const dynamicPlayerType = options?.dynamicPlayerType ?? queue.data.dynamicPlayer?.type;

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
		data: {
			query: string;
			voiceChannel: VoiceChannel | StageChannel;
			requester: User;
		} & PlayMusicOptions<SongType, PlaylistType>,
	): Promise<PlayType> {
		const { query, voiceChannel, requester, ...options } = data;
		const { queue, musicSettings } = await this.getOrCreateQueueOf(voiceChannel.guild, options?.textChannel);

		const previousPlayerMessage = queue.data.playerMessage;

		const playType = await this.playMusic({
			query,
			queue,
			voiceChannel,
			requester,
			volume: musicSettings.volume,
			options,
		});

		if (playType == PlayType.NEW && queue.data.playerMessage != previousPlayerMessage) {
			try {
				await previousPlayerMessage?.delete();
			} catch (error) {
				// do nothing if error happens
			}
		}

		return playType;
	}

	async playMusic<SongType, PlaylistType>(data: PlayMusicData<SongType, PlaylistType>): Promise<PlayType> {
		await data.queue.join(data.voiceChannel);

		const isQuerySong = !data.query.includes('/playlist');

		if (isQuerySong) {
			return this.playSong(data);
		} else {
			return this.playPlaylist(data);
		}
	}

	protected createSongData(query: string): SongData {
		return {
			query,
		};
	}

	protected async playSong<T>({
		query,
		queue,
		volume,
		requester,
		options,
	}: PlayMusicData<T, undefined, PlaySongCallbacks<T>>): Promise<PlayType> {
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

			return PlayType.ERROR;
		}

		song.setData(this.createSongData(query));

		if (hadSongs) {
			if (searchContext) {
				await options?.onSongAdd?.(song, searchContext);
			}

			return PlayType.ADD;
		} else {
			queue.setVolume(volume);

			if (queue.data.history == undefined) {
				queue.data.history = [song];
			} else {
				queue.data.history.unshift(song);
			}

			if (searchContext) {
				await options?.onSongPlay?.(song, searchContext);
			}

			return PlayType.NEW;
		}
	}

	protected async playPlaylist<T>({
		query,
		queue,
		volume,
		requester,
		options,
	}: PlayMusicData<undefined, T, PlayPlaylistCallbacks<T>>): Promise<PlayType> {
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

			return PlayType.ERROR;
		}

		playlist.songs.forEach((s) => s.setData(this.createSongData(query)));

		if (hadSongs) {
			if (searchContext) {
				await options?.onPlaylistAdd?.(playlist, searchContext);
			}

			return PlayType.ADD;
		} else {
			queue.setVolume(volume);

			if (queue.data.history == undefined) {
				queue.data.history = [playlist.songs[0]];
			} else {
				queue.data.history.unshift(playlist.songs[0]);
			}

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

	updateDynamic(context: MusicContext) {
		const queue = this.getQueueOf(context);

		if (!queue?.data.dynamicPlayer) {
			return null;
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
}
