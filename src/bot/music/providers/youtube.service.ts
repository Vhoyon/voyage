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
		const youtubeId = await this.getYoutubeVideoId(query, message);

		const info = await ytdl.getBasicInfo(youtubeId);

		const url = info.videoDetails.video_url;

		return {
			query,
			source: 'youtube',
			url,
			title: info.videoDetails.title,
			duration: parseInt(info.videoDetails.lengthSeconds),
			getStream: () => this.getStream(url),
		};
	}

	async getStream(url: string) {
		return ytdl(url, {
			filter: 'audioonly',
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			highWaterMark: 1 << 25, // This apparently fixes audio being cut off too soon
		});
	}

	protected async getYoutubeVideoId(query: string, message: Message) {
		if (ytdl.validateURL(query)) {
			// query is already url
			await message.channel.send(`Fetching Youtube video at \`${query}\`!`);

			const videoId = ytdl.getURLVideoID(query);

			return videoId;
		} else {
			await message.channel.send(`Searching Youtube for \`${query}\`!`);

			const youtubeResult = await this.getSearchResult(query);

			return youtubeResult.id;
		}
	}

	protected async getSearchResult(query: string) {
		const youtubeOptions: YouTubeSearchOptions = {
			key: this.env.YOUTUBE_API_KEY,
			maxResults: 10,
			type: 'video',
		};

		const searchResult = await search(query, youtubeOptions);

		return searchResult.results[0];
	}
}
