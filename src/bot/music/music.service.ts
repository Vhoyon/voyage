import { Injectable } from '@nestjs/common';
import { Guild, Message, StreamDispatcher, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { YoutubeService } from './services/youtube.service';

export const VOLUME_LOG = 15;

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
					songs: [song],
					volume: 5,
					playing: false,
					connection,
				};

				this.queue.set(key, newGuildQueue);

				const dispatcher = await this.playSong(newGuildQueue);

				newGuildQueue.dispatcher = dispatcher;

				this.setVolume(newGuildQueue, newGuildQueue.volume);

				newGuildQueue.textChannel.send(`Start playing: **${song.title}**`);
			} catch (error) {
				await message.channel.send(`${error}`);
			}
		}
	}

	protected async playSong(guildQueue: GuildQueue) {
		const song = guildQueue.songs.shift();

		if (!song) {
			guildQueue.voiceChannel.leave();

			this.queue.delete(guildQueue.id);

			return;
		}

		guildQueue.playing = true;

		const getStream = async (song: LinkableSong) => {
			switch (song.source) {
				case 'youtube':
				default:
					return this.youtubeService.getStream(song);
			}
		};

		const stream = await getStream(song);

		const dispatcher = guildQueue.connection
			.play(stream, { type: 'opus' })
			.on('finish', () => {
				guildQueue.playing = false;

				this.playSong(guildQueue);
			})
			.on('error', (error) => {
				guildQueue.playing = false;

				console.error(error);
			});

		return dispatcher;
	}

	protected async getLinkableSong(query: string, options: SearchOptions): Promise<LinkableSong> {
		const youtubeResult = await this.youtubeService.getSearchResult(query, options);

		return {
			query,
			source: 'youtube',
			url: youtubeResult.id,
			title: youtubeResult.title,
		};
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

		if (!guildQueue) {
			await message.channel.send(`Play a song first before trying to skip it!`);
			return;
		}

		guildQueue.connection.dispatcher.end();

		if (guildQueue.songs.length) {
			await message.channel.send(`Skipped!`);
		} else {
			await message.channel.send(`Skipped! No more songs are the the queue, goodbye!`);
		}
	}
}
