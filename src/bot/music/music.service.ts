import { Injectable } from '@nestjs/common';
import { Guild, Message, StreamDispatcher, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { YoutubeService } from './providers/youtube.service';

export const VOLUME_LOG = 15;

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const DISCONNECT_TIMEOUT_MS = 1 * 1000 * 60;

export type SongSource = 'youtube';

export type LinkableSong = {
	query: string;
	source: SongSource;
	url: string;
	title: string;
	description?: string;
};

export type GuildQueue = {
	id: string;
	textChannel: TextChannel;
	voiceChannel: VoiceChannel;
	songs: LinkableSong[];
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
	private readonly queue = new Map<string, GuildQueue>();

	constructor(private readonly youtubeService: YoutubeService) {}

	protected getKeyFromGuild(guild: Guild) {
		return guild.id;
	}

	protected getGuildQueue(of: Message | GuildQueue) {
		if (of instanceof Message) {
			if (!of.guild) {
				return;
			}
			const key = this.getKeyFromGuild(of.guild);

			return this.queue.get(key);
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

		const guildQueue = this.queue.get(key);

		const song = await this.getLinkableSong(query, { message });

		if (!song) {
			await message.channel.send(`Couldn't find a match for query **${query}**`);
			return;
		}

		if (guildQueue) {
			guildQueue.songs.push(song);

			guildQueue.textChannel.send(`Added to queue: **${song.title}**`);
		} else {
			try {
				const connection = await voiceChannel.join();

				const newGuildQueue: GuildQueue = {
					id: key,
					textChannel: message.channel as TextChannel,
					voiceChannel: voiceChannel,
					songs: [],
					volume: 5,
					playing: false,
					doDisconnectImmediately: false,
					connection,
				};

				this.queue.set(key, newGuildQueue);

				await this.playSong(song, newGuildQueue);

				newGuildQueue.textChannel.send(`Start playing: **${song.title}**`);
			} catch (error) {
				await message.channel.send(`${error}`);
			}
		}
	}

	protected clearGuildQueue(guildQueue: GuildQueue) {
		guildQueue.voiceChannel.leave();

		this.queue.delete(guildQueue.id);
	}

	protected async playSong(song: LinkableSong, guildQueue: GuildQueue) {
		const getStream = async (song: LinkableSong) => {
			switch (song.source) {
				case 'youtube':
				default:
					return this.youtubeService.getStream(song);
			}
		};

		const playNextSong = async () => {
			guildQueue.playing = false;

			const nextSong = guildQueue.songs.shift();

			if (!nextSong) {
				if (guildQueue.doDisconnectImmediately) {
					this.clearGuildQueue(guildQueue);
				} else {
					guildQueue.disconnectTimeoutId = setTimeout(() => this.clearGuildQueue(guildQueue), DISCONNECT_TIMEOUT_MS);
				}

				return;
			}

			this.setVolume(guildQueue, guildQueue.volume);

			await this.playSong(nextSong, guildQueue);
		};

		if (guildQueue.disconnectTimeoutId) {
			clearTimeout(guildQueue.disconnectTimeoutId);
		}

		const stream = await getStream(song);

		guildQueue.playing = true;

		const dispatcher = guildQueue.connection
			.play(stream, { type: 'opus' })
			.on('finish', playNextSong)
			.on('error', (error) => {
				guildQueue.playing = false;

				console.error(error);
			});

		guildQueue.dispatcher = dispatcher;

		this.setVolume(guildQueue, guildQueue.volume);
	}

	protected async getLinkableSong(query: string, options: SearchOptions): Promise<LinkableSong | null> {
		const linkableSong = await this.youtubeService.getLinkableSong(query, options.message);

		return linkableSong;
	}

	setVolume(of: Message | GuildQueue, volume: number) {
		const guildQueue = this.getGuildQueue(of);

		if (guildQueue?.dispatcher) {
			guildQueue.dispatcher.setVolumeLogarithmic(volume / VOLUME_LOG);

			guildQueue.volume = volume;
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

		const guildQueue = this.queue.get(key);

		if (!guildQueue?.playing) {
			await message.channel.send(`Play a song first before trying to skip it!`);
			return;
		}

		const didSkipAll = !guildQueue.songs.length;

		if (didSkipAll) {
			guildQueue.doDisconnectImmediately = true;
		}

		guildQueue.connection.dispatcher.end();

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

		const guildQueue = this.queue.get(key);

		if (!guildQueue) {
			await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		if (guildQueue.playing) {
			guildQueue.songs = [];
			guildQueue.doDisconnectImmediately = true;
			guildQueue.connection.dispatcher.end();
		} else {
			this.clearGuildQueue(guildQueue);
		}

		await message.channel.send(`Adios!`);
	}
}
