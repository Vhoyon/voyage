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

	async getLinkableSong(query: string, message: Message): Promise<LinkableSong> {
		const youtubeResult = await this.getSearchResult(query, message);

		return {
			query,
			source: 'youtube',
			url: youtubeResult.id,
			title: youtubeResult.title,
		};
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
		});
	}
}
