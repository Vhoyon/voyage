import { InformError } from '$/bot/common/error/inform-error';
import { GuildChannelsContext, MessageService, SendableOptions } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseMsIntoTime, parseTimeIntoSeconds } from '$common/utils/funcs';
import { bold, inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Queue, RepeatMode, Song } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { EmbedFieldData, InteractionButtonOptions, Message, MessageActionRow, MessageButton, TextChannel } from 'discord.js';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { MusicInteractionConstant } from '../music.constant';

export const VOLUME_LOG = 15;

export const DEFAULT_VIEW_QUEUED_SONG = 10;

export type QueueData = {
	textChannel: TextChannel;
	isPaused?: boolean;
	lastPlayedSong?: Song;
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export type MusicContext = GuildChannelsContext | Queue;

@Injectable()
export class MusicService {
	private readonly logger = new Logger(MusicService.name);

	private readonly player;

	constructor(
		readonly discordProvider: DiscordClientProvider,
		readonly env: EnvironmentConfig,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
	) {
		this.player = new Player(discordProvider.getClient(), {
			deafenOnJoin: true,
			leaveOnEnd: true,
			leaveOnEmpty: true,
			timeout: env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000,
		});

		this.player
			.on('songChanged', async (queue, newSong) => {
				try {
					await this.prisma.musicSetting.updateMany({
						data: {
							lastSongPlayed: (newSong.data as SongData).query,
							nbOfSongsPlayed: {
								increment: 1,
							},
						},
						where: {
							guild: {
								guildId: queue.guild.id,
							},
						},
					});
				} catch (error) {
					this.logger.error(error);
				}
			})
			.on('songChanged', async (queue, _newSong, oldSong) => {
				if (queue.repeatMode != RepeatMode.SONG) {
					(queue.data as QueueData).lastPlayedSong = oldSong;
				}
			})
			.on('channelEmpty', async (queue) => {
				this.messageService.sendInfo((queue.data as QueueData).textChannel, `Nobody's listening to me anymore, cya!`);
			})
			.on('error', (error, queue) => {
				if (typeof error == 'string') {
					if (error == 'Status code: 410') {
						this.messageService.sendError(
							(queue.data as QueueData).textChannel,
							`Couldn't play the given query. If you used a link, make sure the video / playlist is not private or age restricted!`,
						);
					} else {
						this.logger.error(`Error: "${error}" in guild named "${queue.guild?.name}"`);
					}
				}
			});
	}

	protected getQueue(of: MusicContext) {
		if (of instanceof Queue) {
			return of;
		}

		if (!of.guild) {
			return null;
		}

		return this.player.getQueue(of.guild.id);
	}

	async play(query: string, message: Message) {
		if (!message.guild) {
			return;
		}
		if (!message.member?.voice.channel) {
			return;
		}

		let queue = this.getQueue(message);

		let guildMusicSettings = await this.prisma.musicSetting.findFirst({
			where: {
				guild: {
					guildId: message.guild.id,
				},
			},
		});

		if (!guildMusicSettings) {
			guildMusicSettings = await this.prisma.musicSetting.create({
				data: {
					guild: {
						connect: {
							guildId: message.guild.id,
						},
					},
				},
			});
		}

		if (!queue) {
			queue = this.player.createQueue(message.guild.id, {
				data: {
					textChannel: message.channel,
				} as QueueData,
				volume: guildMusicSettings.volume,
			});
		}

		await queue.join(message.member.voice.channel);

		const isQuerySong = !query.includes('/playlist');

		const createSongData = (): SongData => ({
			query,
		});

		const botMessage = await this.messageService.send(message, bold(`Searching for ${inlineCode(query)}...`));

		const hadSongs = queue.songs.length;

		const playerButtons = this.createPlayerButtons();

		const commonOptions: SendableOptions = {
			components: [...playerButtons],
		};

		try {
			if (isQuerySong) {
				const song = await queue.play(query, {
					requestedBy: message.author,
				});

				song.setData(createSongData());

				const songFields: EmbedFieldData[] = [
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
						value: `${guildMusicSettings.volume}/${VOLUME_MAXIMUM}`,
						inline: true,
					},
				];

				if (hadSongs) {
					await this.messageService.replace(message, botMessage, {
						...commonOptions,
						title: `Added song ${inlineCode(song.name)} to the queue!`,
						thumbnail: {
							url: song.thumbnail,
						},
						fields: songFields,
						url: song.url,
					});
				} else {
					(queue.data as QueueData).lastPlayedSong = song;

					await this.messageService.replace(message, botMessage, {
						...commonOptions,
						title: `Playing song ${inlineCode(song.name)}!`,
						thumbnail: {
							url: song.thumbnail,
						},
						fields: songFields,
						url: song.url,
					});
				}
			} else {
				const playlist = await queue.playlist(query, {
					requestedBy: message.author,
				});

				playlist.songs.forEach((s) => s.setData(createSongData()));

				const totalDuration = playlist.songs.reduce((acc, song) => acc + song.millisecons, 0);

				const formattedTotalDuration = parseMsIntoTime(totalDuration);

				const playlistFields: EmbedFieldData[] = [
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
						value: `${guildMusicSettings.volume}/${VOLUME_MAXIMUM}`,
						inline: true,
					},
				];

				if (hadSongs) {
					await this.messageService.replace(message, botMessage, {
						...commonOptions,
						title: `Added playlist ${inlineCode(playlist.name)}!`,
						fields: playlistFields,
						url: playlist.url,
					});
				} else {
					(queue.data as QueueData).lastPlayedSong = playlist.songs[0];

					await this.messageService.replace(message, botMessage, {
						...commonOptions,
						title: `Playing playlist ${inlineCode(playlist.name)}!`,
						fields: playlistFields,
						url: playlist.url,
					});
				}
			}
		} catch (error) {
			await this.messageService.replace(
				message,
				botMessage,
				`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video / playlist is not private!`,
				'error',
			);
		}
	}

	createPlayerButtons() {
		const queueInteractions: Pick<InteractionButtonOptions, 'customId' | 'emoji'>[] = [
			{
				customId: MusicInteractionConstant.LAST_SONG,
				emoji: '⏮',
			},
			{
				customId: MusicInteractionConstant.PLAY_PAUSE,
				emoji: '⏯',
			},
			{
				customId: MusicInteractionConstant.SKIP,
				emoji: '⏩',
			},
		];

		const queueRow = new MessageActionRow({
			components: queueInteractions.map((interaction) => {
				return new MessageButton({
					style: 'SECONDARY',
					...interaction,
				});
			}),
		});

		const playerInteractions: Pick<InteractionButtonOptions, 'customId' | 'emoji'>[] = [
			{
				customId: MusicInteractionConstant.REPEAT,
				emoji: '🔂',
			},
			{
				customId: MusicInteractionConstant.REPEAT_ALL,
				emoji: '🔁',
			},
			{
				customId: MusicInteractionConstant.DISCONNECT,
				emoji: '⏹',
			},
		];

		const playerRow = new MessageActionRow({
			components: playerInteractions.map((interaction) => {
				return new MessageButton({
					style: 'SECONDARY',
					...interaction,
				});
			}),
		});

		return [queueRow, playerRow];
	}

	async setVolume(of: MusicContext, volume: number) {
		const queue = this.getQueue(of);

		const guildId = of.guild!.id;

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

		queue?.setVolume(volume);

		return !!queue?.isPlaying;
	}

	async playLastPlayedSong(context: MusicContext) {
		const queue = this.getQueue(context);

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
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
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
			queue.destroy(true);

			return `Skipped ${inlineCode(songSkipped.name)}. No more songs are in the queue, goodbye!`;
		}
	}

	disconnect(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue) {
			throw new InformError(`I'm not even playing a song :/`);
		}

		queue.destroy(true);

		return `Adios!`;
	}

	pause(context: MusicContext) {
		const queue = this.getQueue(context);

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
		const queue = this.getQueue(context);

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
		const queue = this.getQueue(context);

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
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
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

	loop(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
			throw new InformError(`I cannot set a looping song when nothing is playing!`);
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			throw new InformError(`This song is already looping!`);
		}

		queue.setRepeatMode(RepeatMode.SONG);

		return `Looping current song (${inlineCode(queue.nowPlaying.name)})!`;
	}

	loopAll(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
			throw new InformError(`I cannot loop the player when nothing is playing!`);
		}

		queue.setRepeatMode(RepeatMode.QUEUE);

		return `Looping all song in the current playlist!`;
	}

	unloop(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
			throw new InformError(`I don't need to unloop anything : nothing is playing!`);
		}

		queue.setRepeatMode(RepeatMode.DISABLED);

		return `Unlooped the current music playlist!`;
	}

	shuffle(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
			throw new InformError(`I cannot shuffle the queue when nothing is playing!`);
		}

		queue.shuffle();

		return `Shuffled the queue!`;
	}

	viewQueue(context: MusicContext, nbOfSongsToDisplay = DEFAULT_VIEW_QUEUED_SONG) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
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

	nowPlaying(context: MusicContext) {
		const queue = this.getQueue(context);

		if (!queue?.isPlaying) {
			throw new InformError(`Nothing is currently playing!`);
		}

		const song = queue.nowPlaying;

		const progressBar = queue.createProgressBar().prettier;

		let repeatMode: string;

		switch (queue.repeatMode) {
			case RepeatMode.SONG:
				repeatMode = 'Looping Song';
				break;
			case RepeatMode.QUEUE:
				repeatMode = 'Looping Queue';
				break;
			case RepeatMode.DISABLED:
			default:
				repeatMode = 'Disabled';
				break;
		}

		const playerButtons = this.createPlayerButtons();

		return {
			title: `Now playing : ${inlineCode(song.name)}!`,
			thumbnail: {
				url: song.thumbnail,
			},
			components: [...playerButtons],
			fields: [
				{
					name: 'Requester',
					value: song.requestedBy!.tag,
					inline: true,
				},
				{
					name: 'Author',
					value: inlineCode(song.author),
					inline: true,
				},
				{
					name: 'Remaining songs',
					value: queue.songs.length.toString(),
					inline: true,
				},
				{
					name: 'Repeat Mode',
					value: repeatMode,
					inline: true,
				},
				{
					name: 'Volume',
					value: `${queue.volume}/${VOLUME_MAXIMUM}`,
					inline: true,
				},
				{
					name: 'Progress',
					value: inlineCode(progressBar),
				},
			],
			url: song.url,
		} as SendableOptions;
	}
}
