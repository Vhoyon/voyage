import { EnvironmentConfig } from '$/env.validation';
import { parseTimeIntoSeconds } from '$/utils/funcs';
import { PromiseLike } from '$/utils/types';
import { Injectable, Type } from '@nestjs/common';
import { Guild, Message, StreamDispatcher, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';
import { MusicProvider } from './providers/music-provider.interface';
import { YoutubeService } from './providers/youtube.service';

export const VOLUME_LOG = 15;

export type SearchOptions = {
	message: Message;
	forceProvider?: Type<MusicProvider>;
};

export type PlaySongOptions = {
	seek: number;
};

export type LinkableSong = {
	query: string;
	provider: Type<MusicProvider>;
	url: string;
	title: string;
	description?: string;
	/** Duration of the song in seconds */
	duration: number;
	getStream: () => PromiseLike<Readable>;
	options?: Partial<PlaySongOptions>;
};

export type MusicBoard = {
	id: string;
	textChannel: TextChannel;
	voiceChannel: VoiceChannel;
	songQueue: LinkableSong[];
	lastSongPlayed?: LinkableSong;
	volume: number;
	playing: boolean;
	connection: VoiceConnection;
	dispatcher?: StreamDispatcher;
	doDisconnectImmediately: boolean;
	disconnectTimeoutId?: NodeJS.Timeout;
	looping?: 'one' | 'all' | number;
};

@Injectable()
export class MusicService {
	private readonly guildBoards = new Map<string, MusicBoard>();

	/** Disconnect timeout, in seconds. */
	private readonly DISCONNECT_TIMEOUT: number;
	private readonly ALONE_DISCONNECT_TIMEOUT: number;

	static readonly seekBlacklist: Type<MusicProvider>[] = [YoutubeService];

	readonly providers: MusicProvider[];
	readonly fallbackProvider: MusicProvider;

	constructor(readonly env: EnvironmentConfig, readonly youtubeService: YoutubeService) {
		this.DISCONNECT_TIMEOUT = env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000;
		this.ALONE_DISCONNECT_TIMEOUT = env.DISCORD_MUSIC_ALONE_DISCONNECT_TIMEOUT * 1000;

		this.providers = [youtubeService];
		this.fallbackProvider = youtubeService;
	}

	protected getKeyFromGuild(guild: Guild) {
		return guild.id;
	}

	protected getMusicBoard(of: Message | MusicBoard | Guild) {
		if (of instanceof Message || of instanceof Guild) {
			if (of instanceof Message) {
				if (!of.guild) {
					return;
				}
				if (!of.member?.voice.channel) {
					return;
				}
			}

			const guild = of instanceof Message ? of.guild : of;

			if (!guild) {
				return;
			}

			const key = this.getKeyFromGuild(guild);

			return this.guildBoards.get(key);
		}

		return of;
	}

	protected cancelMusicBoardTimeout(musicBoard: MusicBoard) {
		if (musicBoard.disconnectTimeoutId) {
			clearTimeout(musicBoard.disconnectTimeoutId);
		}

		musicBoard.disconnectTimeoutId = undefined;
	}

	async play(query: string, message: Message) {
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		const voiceChannel = message.member.voice.channel;

		const key = this.getKeyFromGuild(message.guild);

		const musicBoard = this.guildBoards.get(key);

		const song = await this.getLinkableSong(query, { message });

		if (!song) {
			await message.channel.send(`Couldn't find a match for query **${query}**`);
			return;
		}

		if (musicBoard) {
			musicBoard.songQueue.push(song);

			musicBoard.textChannel.send(`Added to queue: **${song.title}**`);
		} else {
			try {
				const connection = await voiceChannel.join();

				const newMusicBoard: MusicBoard = {
					id: key,
					textChannel: message.channel as TextChannel,
					voiceChannel: voiceChannel,
					songQueue: [],
					volume: 5,
					playing: false,
					doDisconnectImmediately: false,
					connection,
				};

				this.guildBoards.set(key, newMusicBoard);

				await this.playSong(song, newMusicBoard);

				newMusicBoard.textChannel.send(`Start playing: **${song.title}**`);
			} catch (error) {
				await message.channel.send(`${error}`);
			}
		}
	}

	protected leaveAndClearMusicBoard(musicBoard: MusicBoard) {
		if (musicBoard.playing) {
			this.endCurrentSong(musicBoard, { disconnect: true });
		} else {
			musicBoard.voiceChannel.leave();

			this.guildBoards.delete(musicBoard.id);
		}
	}

	protected endCurrentSong(musicBoard: MusicBoard, options?: Partial<{ disconnect: boolean }>) {
		if (options?.disconnect) {
			musicBoard.songQueue = [];
			musicBoard.doDisconnectImmediately = true;
		}

		musicBoard.connection.dispatcher.end();
	}

	protected async playSong(song: LinkableSong, musicBoard: MusicBoard) {
		const playNextSong = async () => {
			musicBoard.playing = false;

			if (musicBoard.looping == 'one') {
				musicBoard.songQueue = [musicBoard.lastSongPlayed!, ...musicBoard.songQueue];
			}

			const nextSong = musicBoard.songQueue.shift();

			if (musicBoard.looping == 'all') {
				musicBoard.songQueue = [...musicBoard.songQueue, musicBoard.lastSongPlayed!];
			}

			if (!nextSong) {
				if (musicBoard.doDisconnectImmediately) {
					this.leaveAndClearMusicBoard(musicBoard);
				} else {
					musicBoard.disconnectTimeoutId = setTimeout(() => this.leaveAndClearMusicBoard(musicBoard), this.DISCONNECT_TIMEOUT);
				}

				return;
			}

			this.setVolume(musicBoard, musicBoard.volume);

			await this.playSong(nextSong, musicBoard);
		};

		this.cancelMusicBoardTimeout(musicBoard);

		musicBoard.lastSongPlayed = song;

		const stream = await song.getStream();

		musicBoard.playing = true;

		const dispatcher = musicBoard.connection
			.play(stream, {
				type: song.url.includes('youtube.com') ? 'opus' : 'ogg/opus',
				seek: song.options?.seek,
			})
			.on('finish', playNextSong)
			.on('error', (error) => {
				musicBoard.playing = false;

				console.error(error);
			});

		musicBoard.dispatcher = dispatcher;

		this.setVolume(musicBoard, musicBoard.volume);
	}

	protected async getLinkableSong(query: string, options: SearchOptions): Promise<LinkableSong | null> {
		if (options.forceProvider) {
			const forcedProvider = this.providers.find((provider) => provider instanceof options.forceProvider!);

			if (!forcedProvider) {
				return null;
			}

			const linkableSong = await forcedProvider.getLinkableSong(query, forcedProvider.isQueryProviderUrl(query), options.message);

			return linkableSong;
		}

		// No forced provider, find first that matches
		const provider = this.providers.find((provider) => provider.isQueryProviderUrl(query));

		const linkableSong = await (provider ?? this.fallbackProvider).getLinkableSong(query, !!provider, options.message);

		return linkableSong;
	}

	setVolume(of: Message | MusicBoard, volume: number) {
		const musicBoard = this.getMusicBoard(of);

		if (musicBoard?.dispatcher) {
			musicBoard.dispatcher.setVolumeLogarithmic(volume / VOLUME_LOG);

			musicBoard.volume = volume;
		}
	}

	async skip(message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard?.playing) {
			await message.channel.send(`Play a song first before trying to skip it!`);
			return;
		}

		const didSkipAll = !musicBoard.songQueue.length;

		if (didSkipAll) {
			musicBoard.doDisconnectImmediately = true;
		}

		this.endCurrentSong(musicBoard);

		if (!didSkipAll) {
			await message.channel.send(`Skipped!`);
		} else {
			await message.channel.send(`Skipped! No more songs are the the queue, goodbye!`);
		}
	}

	async disconnect(message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard) {
			await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		if (musicBoard.playing) {
			this.endCurrentSong(musicBoard, { disconnect: true });
		} else {
			this.leaveAndClearMusicBoard(musicBoard);
		}

		await message.channel.send(`Adios!`);
	}

	async seek(timestamp: string, message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard?.playing) {
			await message.channel.send(`I cannot seek through a song when nothing is playing!`);
			return;
		}

		const seekedSong = musicBoard.lastSongPlayed!;

		if (MusicService.seekBlacklist.includes(seekedSong.provider)) {
			await message.channel.send(`Unfortunately, seeking for \`${seekedSong.provider}\` is not available.`);
			return;
		}

		const seekTime = parseTimeIntoSeconds(timestamp);

		seekedSong.options = { ...seekedSong.options, seek: seekTime };

		musicBoard.songQueue = [seekedSong, ...musicBoard.songQueue];

		this.endCurrentSong(musicBoard);

		await message.channel.send(`Seeked current song to ${seekTime} seconds!`);
	}

	async startAloneTimeout(guild: Guild) {
		const musicBoard = this.getMusicBoard(guild);

		if (!musicBoard) {
			return;
		}

		musicBoard.disconnectTimeoutId = setTimeout(() => {
			musicBoard.textChannel.send(`Nobody's listening to me anymore, cya!`);

			this.leaveAndClearMusicBoard(musicBoard);
		}, this.ALONE_DISCONNECT_TIMEOUT);
	}

	async stopAloneTimeout(guild: Guild) {
		const musicBoard = this.getMusicBoard(guild);

		if (!musicBoard) {
			return;
		}

		this.cancelMusicBoardTimeout(musicBoard);
	}

	async loop(message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard?.playing) {
			await message.channel.send(`I cannot set a looping song when nothing is playing!`);
			return;
		}

		musicBoard.looping = 'one';

		await message.channel.send(`Looping current song (\`${musicBoard.lastSongPlayed!.title}\`)!`);
	}

	async loopAll(message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard?.playing) {
			await message.channel.send(`I cannot loop the player when nothing is playing!`);
			return;
		}

		musicBoard.looping = 'all';

		await message.channel.send(`Looping all song in the current playlist!`);
	}

	async unloop(message: Message) {
		const musicBoard = this.getMusicBoard(message);

		if (!musicBoard?.playing) {
			await message.channel.send(`I don't need to unloop anything : nothing is playing!`);
			return;
		}

		musicBoard.looping = undefined;

		await message.channel.send(`Unlooped the current music playlist!`);
	}
}
