import { EnvironmentConfig } from '$/env.validation';
import { Injectable } from '@nestjs/common';
import { Message, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import search, { YouTubeSearchOptions } from 'youtube-search';
import ytdl from 'ytdl-core';

export const VOLUME_LOG = 15;

export type SongSource = 'youtube';

export type LinkableSong = {
	query: string;
	type: SongSource;
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
	connection?: VoiceConnection;
};

@Injectable()
export class MusicService {
	private readonly queue = new Map<string, GuildQueue>();

	constructor(private readonly configService: EnvironmentConfig) {}

	async play(query: string, message: Message) {
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		const voiceChannel = message.member.voice.channel;

		const key = message.guild.id;

		const guildQueue = this.queue.get(key);

		const linkableSong = await this.getLinkableSong(query);

		if (guildQueue) {
			guildQueue.songs.push(linkableSong);
		} else {
			const newGuildQueue: GuildQueue = {
				id: key,
				textChannel: message.channel as TextChannel,
				voiceChannel: voiceChannel,
				songs: [linkableSong],
				volume: 5,
				playing: false,
			};

			try {
				const connection = await voiceChannel.join();

				newGuildQueue.connection = connection;

				this.queue.set(key, newGuildQueue);

				this.playSong(newGuildQueue);
			} catch (error) {
				await message.channel.send(`${error}`);
			}
		}
	}

	protected playSong(guildQueue: GuildQueue) {
		const song = guildQueue.songs.shift();

		if (!song) {
			guildQueue.voiceChannel.leave();

			this.queue.delete(guildQueue.id);

			return;
		}

		guildQueue.playing = true;

		function getStream(song: LinkableSong) {
			switch (song.type) {
				case 'youtube':
				default:
					return ytdl(song.url);
			}
		}

		const stream = getStream(song);

		const dispatcher = guildQueue
			.connection!.play(stream)
			.on('finish', () => {
				guildQueue.playing = false;

				this.playSong(guildQueue);
			})
			.on('error', (error) => {
				guildQueue.playing = false;

				console.error(error);
			});

		dispatcher.setVolumeLogarithmic(guildQueue.volume / VOLUME_LOG);

		guildQueue.textChannel.send(`Start playing: **${song.title}**`);
	}

	protected async getLinkableSong(query: string): Promise<LinkableSong> {
		const youtubeResult = await this.searchYoutubeVideos(query);

		return {
			query,
			type: 'youtube',
			url: youtubeResult.id,
			title: youtubeResult.title,
		};
	}

	protected async searchYoutubeVideos(query: string) {
		const youtubeOptions: YouTubeSearchOptions = {
			key: this.configService.YOUTUBE_API_KEY,
			maxResults: 10,
			type: 'video',
		};

		const searchResult = await search(query, youtubeOptions);

		return searchResult.results[0];
	}
}
