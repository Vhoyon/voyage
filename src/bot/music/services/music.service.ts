import { InformError } from '$/bot/common/error/inform-error';
import { MessageService, SendableOptions } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseMsIntoTime, parseTimeIntoSeconds } from '$common/utils/funcs';
import { MusicSetting } from '.prisma/client';
import { bold, inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Playlist, Queue, RepeatMode, Song } from 'discord-music-player';
import { Message } from 'discord.js';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { DynamicPlayerOptions, MusicContext, PlayerService, QueueData, SongData } from './player.service';

export const DEFAULT_VIEW_QUEUED_SONG = 10;

export type PlayOptions = {
	sendMessages?: boolean;
	dynamicPlayerOptions?: DynamicPlayerOptions;
};

export type PlayQueryOptions = {
	query: string;
	queue: Queue;
	message: Message;
	botMessage: Message | undefined;
	musicSettings: MusicSetting;
	options?: PlayOptions;
};

@Injectable()
export class MusicService {
	private readonly logger = new Logger(MusicService.name);

	constructor(
		private readonly player: PlayerService,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
	) {
		this.player.on('channelEmpty', async (queue) => {
			this.messageService.sendInfo((queue.data as QueueData).textChannel, `Nobody's listening to me anymore, cya!`);
		});
	}

	async play(query: string, message: Message, options?: PlayOptions) {
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		const { queue, musicSettings } = await this.player.getOrCreateQueueOf(message);

		await queue.join(message.member.voice.channel);

		const isQuerySong = !query.includes('/playlist');

		let botMessage: Message | undefined;

		if (options?.sendMessages) {
			botMessage = await this.messageService.send(message, bold(`Searching for ${inlineCode(query)}...`));
		}

		if (isQuerySong) {
			await this.playSong({ query, queue, message, botMessage, musicSettings, options });
		} else {
			await this.playPlaylist({ query, queue, message, botMessage, musicSettings, options });
		}
	}

	protected createSongData(query: string): SongData {
		return {
			query,
		};
	}

	protected async playSong({ query, queue, message, botMessage, musicSettings, options }: PlayQueryOptions) {
		let song: Song;

		try {
			song = await queue.play(query, {
				requestedBy: message.author,
			});
		} catch (error) {
			if (botMessage) {
				await this.messageService.replace(
					message,
					botMessage,
					`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video / playlist is not private!`,
					'error',
				);
			}

			return;
		}

		song.setData(this.createSongData(query));

		const hadSongs = queue.songs.length;

		if (hadSongs) {
			if (botMessage) {
				const playerButtons = this.player.createPlayerButtons();

				await this.messageService.replace(message, botMessage, {
					title: `Added song ${inlineCode(song.name)} to the queue!`,
					thumbnail: {
						url: song.thumbnail,
					},
					fields: [
						{
							name: 'Author',
							value: inlineCode(song.author),
							inline: true,
						},
						{
							name: 'Duration',
							value: inlineCode(song.duration),
							inline: true,
						},
						{
							name: 'Volume',
							value: `${musicSettings.volume}/${VOLUME_MAXIMUM}`,
							inline: true,
						},
					],
					url: song.url,
					components: [...playerButtons],
				});
			}
		} else {
			(queue.data as QueueData).lastPlayedSong = song;

			if (botMessage) {
				const nowPlayingWidget = this.player.createNowPlayingWidget(queue, {
					showStopDynamicPlayer: !!options?.dynamicPlayerOptions?.type,
				});
				const playerMessage = await this.messageService.replace(message, botMessage, nowPlayingWidget);

				if (options?.dynamicPlayerOptions?.type) {
					await this.player.setDynamic(queue, playerMessage, options?.dynamicPlayerOptions);
				}
			}
		}
	}

	protected async playPlaylist({ query, queue, message, botMessage, musicSettings, options }: PlayQueryOptions) {
		let playlist: Playlist;

		try {
			playlist = await queue.playlist(query, {
				requestedBy: message.author,
			});
		} catch (error) {
			if (botMessage) {
				await this.messageService.replace(
					message,
					botMessage,
					`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video / playlist is not private!`,
					'error',
				);
			}

			return;
		}

		playlist.songs.forEach((s) => s.setData(this.createSongData(query)));

		const hadSongs = queue.songs.length;

		if (hadSongs) {
			if (botMessage) {
				const playerButtons = this.player.createPlayerButtons();

				const totalDuration = playlist.songs.reduce((acc, song) => acc + song.millisecons, 0);
				const formattedTotalDuration = parseMsIntoTime(totalDuration);

				await this.messageService.replace(message, botMessage, {
					title: `Added playlist ${inlineCode(playlist.name)}!`,
					fields: [
						{
							name: 'Songs Count',
							value: inlineCode(playlist.songs.length.toString()),
							inline: true,
						},
						{
							name: 'Total Duration',
							value: inlineCode(formattedTotalDuration),
							inline: true,
						},
						{
							name: 'Volume',
							value: `${musicSettings.volume}/${VOLUME_MAXIMUM}`,
							inline: true,
						},
					],
					url: playlist.url,
					components: [...playerButtons],
				});
			}
		} else {
			(queue.data as QueueData).lastPlayedSong = playlist.songs[0];

			if (botMessage) {
				const nowPlayingWidget = this.player.createNowPlayingWidget(queue, {
					showStopDynamicPlayer: !!options?.dynamicPlayerOptions?.type,
				});

				const playerMessage = await this.messageService.replace(message, botMessage, nowPlayingWidget);

				if (options?.dynamicPlayerOptions?.type) {
					await this.player.setDynamic(queue, playerMessage, options?.dynamicPlayerOptions);
				}
			}
		}
	}

	async setVolume(of: MusicContext, volume: number) {
		const queue = this.player.getQueueOf(of);

		const guildId = of.guild?.id;

		if (guildId) {
			try {
				await this.prisma.musicSetting.updateMany({
					data: {
						volume,
					},
					where: {
						guild: {
							guildId,
						},
						volume: {
							not: volume,
						},
					},
				});
			} catch (error) {
				this.logger.error(error);
			}
		}

		queue?.setVolume(volume);

		return !!this.player.hasQueueAndPlaying(queue);
	}

	async playLastPlayedSong(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!queue || !(queue.data as QueueData).lastPlayedSong) {
			throw new InformError(`You need to at least play one song before I can play the last played song!`);
		}

		const lastPlayedSong = (queue.data as QueueData).lastPlayedSong!;

		const isSameSong = lastPlayedSong == queue.nowPlaying;

		if (isSameSong) {
			queue.songs.shift();
		}

		queue.songs = [lastPlayedSong, ...queue.songs];

		await queue.play(lastPlayedSong, {
			immediate: true,
			data: lastPlayedSong.data,
		});

		if (isSameSong) {
			return `No more songs to go back to, starting song ${inlineCode(lastPlayedSong.name)} from the beginning!`;
		} else {
			return `Playing back ${inlineCode(lastPlayedSong.name)}!`;
		}
	}

	skip(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`Play a song first before trying to skip it!`);
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			throw new InformError(`Cannot skip currently looping song ${inlineCode(queue.nowPlaying.name)}. Use the unloop command first!`);
		}

		let nextSong: Song | undefined;

		try {
			nextSong = queue.songs[1];
		} catch (error) {
			// might be out of bounds here
		}

		const songSkipped = queue.skip();

		(songSkipped.data as SongData).skipped = true;

		if (nextSong) {
			return `Skipped ${inlineCode(songSkipped.name)}. Now playing ${inlineCode(nextSong.name)}!`;
		} else {
			this.player.disconnect(queue);

			return `Skipped ${inlineCode(songSkipped.name)}. No more songs are in the queue, goodbye!`;
		}
	}

	async disconnect(context: MusicContext) {
		const didDisconnect = await this.player.disconnect(context);

		if (!didDisconnect) {
			throw new InformError(`I'm not even playing a song :/`);
		}

		return `Adios!`;
	}

	pause(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!queue) {
			throw new InformError(`I'm not even playing a song :/`);
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (wasPaused) {
			throw new InformError(`The player is already paused! To resume the song, use the resume command!`);
		}

		queue.setPaused(true);
		(queue.data as QueueData).isPaused = true;

		return `Paused ${inlineCode(queue.nowPlaying.name)}!`;
	}

	resume(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!queue) {
			throw new InformError(`There is no song to resume, play a song first!`);
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (!wasPaused) {
			throw new InformError(`There is no song to resume, play a song first!`);
		}

		queue.setPaused(false);
		(queue.data as QueueData).isPaused = false;

		return `Resumed ${inlineCode(queue.nowPlaying.name)}!`;
	}

	togglePause(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!queue) {
			throw new InformError(`Play a song first!`);
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (wasPaused) {
			return this.resume(queue);
		} else {
			return this.pause(queue);
		}
	}

	async seek(timestamp: string, context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I cannot seek through a song when nothing is playing...`);
		}

		const seekTime = parseTimeIntoSeconds(timestamp);
		const seekTimeMS = seekTime * 1000;

		if (seekTimeMS > queue.nowPlaying.millisecons) {
			throw new InformError(
				`You are trying to seek to a time greater than the song itself (${inlineCode(
					queue.nowPlaying.duration,
				)}). If you want to skip the song, use the skip command!`,
			);
		}

		await queue.seek(seekTimeMS);

		return `Seeked current song to ${timestamp}!`;
	}

	toggleLoop(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I cannot set a looping song when nothing is playing!`);
		}

		if (queue.repeatMode != RepeatMode.SONG) {
			queue.setRepeatMode(RepeatMode.SONG);

			return `Looping current song (${inlineCode(queue.nowPlaying.name)})!`;
		} else {
			queue.setRepeatMode(RepeatMode.DISABLED);

			return `Disabled looping!`;
		}
	}

	toggleLoopAll(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I cannot loop the player when nothing is playing!`);
		}

		if (queue.repeatMode != RepeatMode.QUEUE) {
			queue.setRepeatMode(RepeatMode.QUEUE);

			return `Looping all song in the current playlist!`;
		} else {
			queue.setRepeatMode(RepeatMode.DISABLED);

			return `Disabled looping!`;
		}
	}

	unloop(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I don't need to unloop anything : nothing is playing!`);
		}

		queue.setRepeatMode(RepeatMode.DISABLED);

		return `Unlooped the current music playlist!`;
	}

	shuffle(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I cannot shuffle the queue when nothing is playing!`);
		}

		queue.shuffle();

		return `Shuffled the queue!`;
	}

	viewQueue(context: MusicContext, nbOfSongsToDisplay = DEFAULT_VIEW_QUEUED_SONG) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`No queue here!`);
		}

		const formattedSongs = queue.songs
			.slice(0, nbOfSongsToDisplay)
			.map((song, i) => `${bold((i + 1).toString())} : ${inlineCode(song.name)}`);

		return {
			title: `Current queue`,
			description: formattedSongs.join('\n'),
			fields: [
				{
					name: 'Remaining songs',
					value: queue.songs.length.toString(),
					inline: true,
				},
			],
		} as SendableOptions;
	}

	async nowPlaying(context: MusicContext, dynamicPlayerOptions?: DynamicPlayerOptions) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`Nothing is currently playing!`);
		}

		const nowPlayingWidget = this.player.createNowPlayingWidget(queue, {
			showStopDynamicPlayer: !!dynamicPlayerOptions?.type,
		});

		const message = await this.messageService.send((queue.data as QueueData).textChannel, nowPlayingWidget);

		if (dynamicPlayerOptions?.type) {
			await this.player.setDynamic(queue, message, dynamicPlayerOptions);
		}
	}
}
