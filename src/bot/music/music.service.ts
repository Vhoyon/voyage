import { EnvironmentConfig } from '$/env.validation';
import { PromiseLike } from '$/utils/types';
import { Injectable } from '@nestjs/common';
import { Guild, Message, StreamDispatcher, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';
import { YoutubeService } from './providers/youtube.service';

export const VOLUME_LOG = 15;

export type SongSource = 'youtube';

export type LinkableSong = {
	query: string;
	source: SongSource;
	url: string;
	title: string;
	description?: string;
	getStream: () => PromiseLike<Readable>;
};

export type MusicBoard = {
	id: string;
	textChannel: TextChannel;
	voiceChannel: VoiceChannel;
	songQueue: LinkableSong[];
	volume: number;
	playing: boolean;
	connection: VoiceConnection;
	dispatcher?: StreamDispatcher;
	doDisconnectImmediately: boolean;
	disconnectTimeoutId?: NodeJS.Timeout;
};

export type SearchOptions = {
	message: Message;
	forceSource?: SongSource;
};

@Injectable()
export class MusicService {
	private readonly guildBoards = new Map<string, MusicBoard>();

	/** Disconnect timeout, in seconds. */
	private readonly DISCONNECT_TIMEOUT: number;

	constructor(readonly env: EnvironmentConfig, private readonly youtubeService: YoutubeService) {
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		this.DISCONNECT_TIMEOUT = env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000;
	}

	protected getKeyFromGuild(guild: Guild) {
		return guild.id;
	}

	protected getMusicBoard(of: Message | MusicBoard) {
		if (of instanceof Message) {
			if (!of.guild) {
				return;
			}
			const key = this.getKeyFromGuild(of.guild);

			return this.guildBoards.get(key);
		}

		return of;
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

	protected clearMusicBoard(musicBoard: MusicBoard) {
		musicBoard.voiceChannel.leave();

		this.guildBoards.delete(musicBoard.id);
	}

	protected async playSong(song: LinkableSong, musicBoard: MusicBoard) {
		const playNextSong = async () => {
			musicBoard.playing = false;

			const nextSong = musicBoard.songQueue.shift();

			if (!nextSong) {
				if (musicBoard.doDisconnectImmediately) {
					this.clearMusicBoard(musicBoard);
				} else {
					musicBoard.disconnectTimeoutId = setTimeout(() => this.clearMusicBoard(musicBoard), this.DISCONNECT_TIMEOUT);
				}

				return;
			}

			this.setVolume(musicBoard, musicBoard.volume);

			await this.playSong(nextSong, musicBoard);
		};

		if (musicBoard.disconnectTimeoutId) {
			clearTimeout(musicBoard.disconnectTimeoutId);
		}

		const stream = await song.getStream();

		musicBoard.playing = true;

		const dispatcher = musicBoard.connection
			.play(stream, {
				type: song.url.includes('youtube.com') ? 'opus' : 'ogg/opus',
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
		const linkableSong = await this.youtubeService.getLinkableSong(query, options.message);

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
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		const key = this.getKeyFromGuild(message.guild);

		const musicBoard = this.guildBoards.get(key);

		if (!musicBoard?.playing) {
			await message.channel.send(`Play a song first before trying to skip it!`);
			return;
		}

		const didSkipAll = !musicBoard.songQueue.length;

		if (didSkipAll) {
			musicBoard.doDisconnectImmediately = true;
		}

		musicBoard.connection.dispatcher.end();

		if (!didSkipAll) {
			await message.channel.send(`Skipped!`);
		} else {
			await message.channel.send(`Skipped! No more songs are the the queue, goodbye!`);
		}
	}

	async disconnect(message: Message) {
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		const key = this.getKeyFromGuild(message.guild);

		const musicBoard = this.guildBoards.get(key);

		if (!musicBoard) {
			await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		if (musicBoard.playing) {
			musicBoard.songQueue = [];
			musicBoard.doDisconnectImmediately = true;
			musicBoard.connection.dispatcher.end();
		} else {
			this.clearMusicBoard(musicBoard);
		}

		await message.channel.send(`Adios!`);
	}
}
