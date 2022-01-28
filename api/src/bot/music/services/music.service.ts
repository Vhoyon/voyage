import { InformError } from '$/bot/common/error/inform-error';
import { GuildChannelsContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseMsIntoTime, parseTimeIntoSeconds } from '$common/utils/funcs';
import { bold, inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, RepeatMode, Song } from 'discord-music-player';
import { Guild, Message, TextChannel } from 'discord.js';
import { PlayerService } from '../player/player.service';
import { DynamicPlayerOptions, MusicContext, PlayMusicOptions, QueueData, SongData } from '../player/player.types';

export const DEFAULT_VIEW_QUEUED_SONG = 10;

@Injectable()
export class MusicService {
	private readonly logger = new Logger(MusicService.name);

	constructor(
		private readonly player: PlayerService,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
	) {
		this.player.on('channelEmpty', async (queue) => {
			const channel = this.getChannelContext(queue);

			if (channel) {
				this.messageService.sendInfo(channel, `Nobody's listening to me anymore, cya!`);
			}
		});
	}

	getChannelContext(context: MusicContext): GuildChannelsContext | undefined {
		return context instanceof Guild ? undefined : context instanceof Queue ? (context.data as QueueData).textChannel : context;
	}

	async play<SongType, PlaylistType>(query: string, message: Message, options?: PlayMusicOptions<SongType, PlaylistType>) {
		if (!message.member?.voice.channel) {
			return;
		}

		return this.player.play({
			query,
			voiceChannel: message.member.voice.channel,
			requester: message.author,
			textChannel: message.channel instanceof TextChannel ? message.channel : undefined,
			...options,
		});
	}

	async setVolume(of: MusicContext, volume: number) {
		const queue = this.player.getQueueOf(of);

		const guild = of instanceof Guild ? of : of.guild;
		const guildId = guild?.id;

		if (guildId) {
			try {
				const hasMusicSetting = await this.prisma.musicSetting.count({
					where: {
						guild: {
							guildId: guild.id,
						},
					},
				});

				if (!hasMusicSetting) {
					await this.prisma.musicSetting.create({
						data: {
							guild: {
								connect: {
									guildId: guild.id,
								},
							},
						},
					});
				}

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

		if (!queue?.data.lastPlayedSong) {
			throw new InformError(`You need to at least play one song before I can play the last played song!`);
		}

		const lastPlayedSong = queue.data.lastPlayedSong;

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

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I'm not even playing a song :/`);
		}

		const wasPaused = queue.data.isPaused;

		if (wasPaused) {
			throw new InformError(`The player is already paused! To resume the song, use the resume command!`);
		}

		queue.setPaused(true);
		queue.data.isPaused = true;

		return `Paused ${inlineCode(queue.nowPlaying.name)}!`;
	}

	resume(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`There is no song to resume, play a song first!`);
		}

		const wasPaused = queue.data.isPaused;

		if (!wasPaused) {
			throw new InformError(`The song is already playing, no need to resume it!`);
		}

		queue.setPaused(false);
		queue.data.isPaused = false;

		return `Resumed ${inlineCode(queue.nowPlaying.name)}!`;
	}

	togglePause(context: MusicContext) {
		const queue = this.player.getQueueOf(context);

		if (!queue) {
			throw new InformError(`Play a song first!`);
		}

		const wasPaused = queue.data.isPaused;

		if (wasPaused) {
			return this.resume(queue);
		} else {
			return this.pause(queue);
		}
	}

	async seek(context: MusicContext, timestamp: string) {
		const queue = this.player.getQueueOf(context);

		if (!this.player.hasQueueAndPlaying(queue)) {
			throw new InformError(`I cannot seek through a song when nothing is playing...`);
		}

		const seekTime = parseTimeIntoSeconds(timestamp);
		const seekTimeMS = seekTime * 1000;

		if (seekTimeMS > queue.nowPlaying.milliseconds) {
			const inlinedDuration = inlineCode(queue.nowPlaying.duration);

			throw new InformError(
				`You are trying to seek to a time greater than the song itself (${inlinedDuration}). If you want to skip the song, use the skip command!`,
			);
		}

		await queue.seek(seekTimeMS);

		this.player.updateDynamic(queue);

		const formattedTimestamp = parseMsIntoTime(seekTimeMS);

		return `Seeked current song to ${formattedTimestamp}!`;
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
			dynamicPlayerType: dynamicPlayerOptions?.type,
		});

		const channelContext = this.getChannelContext(context);

		if (channelContext) {
			const message = await this.messageService.send(channelContext, nowPlayingWidget);

			if (!message) {
				return;
			}

			if (queue.data.playerMessage) {
				if (queue.data.dynamicPlayer) {
					await this.player.clearDynamic(queue);
				}

				await queue.data.playerMessage.delete();

				queue.data.playerMessage = message;
			}

			if (dynamicPlayerOptions?.type) {
				await this.player.setDynamic(message, dynamicPlayerOptions);
			}
		}
	}
}