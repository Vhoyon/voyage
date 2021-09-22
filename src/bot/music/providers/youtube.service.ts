import { EnvironmentConfig } from '$/env.validation';
import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import search, { YouTubeSearchOptions } from 'youtube-search';
import ytdl from 'ytdl-core-discord';
import { LinkableSong } from '../interfaces/linkable-song.interface';
import { MusicProvider } from '../interfaces/music-provider.interface';

@Injectable()
export class YoutubeService implements MusicProvider {
	constructor(private readonly env: EnvironmentConfig) {}

	isQueryProviderUrl(query: string) {
		return ytdl.validateURL(query);
	}

	async getLinkableSong(query: string, isUrl: boolean, message: Message) {
		const youtubeId = await this.getYoutubeVideoId(query, isUrl, message);

		if (!youtubeId) {
			return null;
		}

		try {
			const info = await ytdl.getBasicInfo(youtubeId);

			const url = info.videoDetails.video_url;

			const song: LinkableSong = {
				query,
				provider: YoutubeService,
				url,
				title: info.videoDetails.title,
				duration: parseInt(info.videoDetails.lengthSeconds),
				getStream: () => this.getStream(url),
			};

			return song;
		} catch (error) {
			throw `Couldn't download video from query \`${query}\`.\nIs the video private / age restricted?`;
		}
	}

	async getStream(url: string) {
		return ytdl(url, {
			filter: 'audioonly',
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			highWaterMark: 1 << 25, // This apparently fixes audio being cut off too soon
		});
	}

	protected async getYoutubeVideoId(query: string, isUrl: boolean, message: Message) {
		if (isUrl) {
			// query is already url
			await message.channel.send(`Fetching Youtube video at \`${query}\`!`);

			const videoId = ytdl.getURLVideoID(query);

			return videoId;
		} else {
			await message.channel.send(`Searching Youtube for \`${query}\`!`);

			const youtubeResult = await this.getSearchResult(query);

			if (!youtubeResult) {
				return null;
			}

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

		if (searchResult.results[0]) {
			return searchResult.results[0];
		}

		return null;
	}
}
