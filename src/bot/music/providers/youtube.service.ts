import { EnvironmentConfig } from '$/env.validation';
import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import search, { YouTubeSearchOptions } from 'youtube-search';
import ytdl from 'ytdl-core-discord';
import { LinkableSong } from '../music.service';
import { MusicProvider } from './music-provider.interface';

@Injectable()
export class YoutubeService implements MusicProvider {
	constructor(private readonly env: EnvironmentConfig) {}

	async getLinkableSong(query: string, message: Message): Promise<LinkableSong | null> {
		try {
			const videoId = ytdl.getURLVideoID(query);

			await message.channel.send(`Fetching Youtube video at \`${query}\`!`);

			const info = await ytdl.getBasicInfo(videoId);

			return {
				query,
				source: 'youtube',
				url: info.videoDetails.video_url,
				title: info.videoDetails.title,
			};
		} catch (error) {
			const youtubeResult = await this.getSearchResult(query, message);

			return {
				query,
				source: 'youtube',
				url: youtubeResult.id,
				title: youtubeResult.title,
			};
		}
	}

	protected async getSearchResult(query: string, message: Message) {
		const youtubeOptions: YouTubeSearchOptions = {
			key: this.env.YOUTUBE_API_KEY,
			maxResults: 10,
			type: 'video',
		};

		await message.channel.send(`Searching Youtube for "${query}"!`);

		const searchResult = await search(query, youtubeOptions);

		return searchResult.results[0];
	}

	async getStream(song: LinkableSong) {
		return ytdl(song.url, {
			filter: 'audioonly',
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			highWaterMark: 1 << 25, // This apparently fixes audio being cut off too soon
		});
	}
}
