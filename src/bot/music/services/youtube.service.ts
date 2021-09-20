import { EnvironmentConfig } from '$/env.validation';
import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import search, { YouTubeSearchOptions } from 'youtube-search';
import ytdl from 'ytdl-core-discord';
import { LinkableSong } from '../music.service';

@Injectable()
export class YoutubeService {
	constructor(private readonly env: EnvironmentConfig) {}

	async getSearchResult(query: string, message: Message) {
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
