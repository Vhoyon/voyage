import { MessageService } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseMsIntoTime, parseTimeIntoSeconds } from '$common/utils/funcs';
import { bold, inlineCode } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Queue, RepeatMode } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { Message, TextChannel, User } from 'discord.js';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';

export const VOLUME_LOG = 15;

export type QueueData = {
	textChannel: TextChannel;
	isPaused?: boolean;
};

export type SongData = {
	query: string;
	requester: User;
	skipped?: boolean;
};

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
			.on('songChanged', async (queue, newSong, oldSong) => {
				if ((oldSong.data as SongData).skipped) {
					await this.messageService.send(
						(queue.data as QueueData).textChannel,
						`Skipped ${inlineCode(oldSong.name)}. Now playing ${inlineCode(newSong.name)}!`,
					);
				}
			})
			.on('queueEnd', async (queue) => {
				const lastPlayedSong = queue.nowPlaying;

				if ((lastPlayedSong.data as SongData).skipped) {
					queue.destroy(true);
					await this.messageService.send(
						(queue.data as QueueData).textChannel,
						`Skipped ${inlineCode(lastPlayedSong.name)}. No more songs are the the queue, goodbye!`,
					);
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

	protected getQueue(of: Message | Queue) {
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
			requester: message.author,
		});

		const botMessage = await this.messageService.send(message, bold(`Searching for ${inlineCode(query)}...`));

		const hadSongs = queue.songs.length;

		try {
			if (isQuerySong) {
				const song = await queue.play(query);

				song.setData(createSongData());

				if (hadSongs) {
					await this.messageService.replaceEmbed(message, botMessage, {
						title: `Added song ${inlineCode(song.name)} to the queue!`,
						thumbnail: {
							url: song.thumbnail,
						},
						fields: [
							{
								name: 'Requested by',
								value: message.author.tag,
								inline: true,
							},
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
						],
					});
				} else {
					await this.messageService.replaceEmbed(message, botMessage, {
						title: `Playing song ${inlineCode(song.name)}!`,
						thumbnail: {
							url: song.thumbnail,
						},
						fields: [
							{
								name: 'Requested by',
								value: message.author.tag,
								inline: true,
							},
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
						],
					});
				}
			} else {
				const playlist = await queue.playlist(query);

				playlist.songs.forEach((s) => s.setData(createSongData()));

				const totalDuration = playlist.songs.reduce((acc, song) => acc + song.millisecons, 0);

				const formattedTotalDuration = parseMsIntoTime(totalDuration);

				if (hadSongs) {
					await this.messageService.replaceEmbed(message, botMessage, {
						title: `Added playlist ${inlineCode(playlist.name)}!`,
						fields: [
							{
								name: 'Requested by',
								value: message.author.tag,
								inline: true,
							},
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
						],
					});
				} else {
					await this.messageService.replaceEmbed(message, botMessage, {
						title: `Playing playlist ${inlineCode(playlist.name)}!`,
						fields: [
							{
								name: 'Requested by',
								value: message.author.tag,
								inline: true,
							},
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
						],
					});
				}
			}
		} catch (error) {
			await this.messageService.replaceEmbed(
				message,
				botMessage,
				`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video / playlist is not private!`,
				'error',
			);
		}
	}

	async setVolume(of: Message | Queue, volume: number) {
		const queue = this.getQueue(of);

		const guildId = of instanceof Message ? of.guild!.id : of.guild.id;

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

	async skip(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `Play a song first before trying to skip it!`);
			return;
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			await this.messageService.sendError(
				message,
				`Cannot skip currently looping song ${inlineCode(queue.nowPlaying.name)}. Use the unloop command first!`,
			);
			return;
		}

		const songSkipped = queue.skip();

		(songSkipped.data as SongData).skipped = true;
	}

	async disconnect(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await this.messageService.sendError(message, `I'm not even playing a song :/`);
			return;
		}

		queue.destroy(true);

		await this.messageService.send(message, `Adios!`);
	}

	async pause(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await this.messageService.sendError(message, `I'm not even playing a song :/`);
			return;
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (wasPaused) {
			await this.messageService.sendError(message, `The player is already paused! To resume the song, use the resume command!`);
			return;
		}

		queue.setPaused(true);
		(queue.data as QueueData).isPaused = true;

		await this.messageService.send(message, `Paused ${inlineCode(queue.nowPlaying.name)}!`);
	}

	async resume(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await this.messageService.sendError(message, `I'm not even playing a song :/`);
			return;
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (!wasPaused) {
			await this.messageService.sendError(message, `There is no song to resume, play a song first!`);
			return;
		}

		queue.setPaused(false);
		(queue.data as QueueData).isPaused = false;

		await this.messageService.send(message, `Resumed ${inlineCode(queue.nowPlaying.name)}!`);
	}

	async seek(timestamp: string, message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `I cannot seek through a song when nothing is playing...`);
			return;
		}

		const seekTime = parseTimeIntoSeconds(timestamp);
		const seekTimeMS = seekTime * 1000;

		if (seekTimeMS > queue.nowPlaying.millisecons) {
			await this.messageService.sendError(
				message,
				`You are trying to seek to a time greater than the song itself (${inlineCode(
					queue.nowPlaying.duration,
				)}). If you want to skip the song, use the skip command!`,
			);
			return;
		}

		const seekedSong = await queue.seek(seekTimeMS);

		if (seekedSong == true) {
			await this.messageService.send(message, `Seeked current song to ${timestamp}!`);
		}
	}

	async loop(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `I cannot set a looping song when nothing is playing!`);
			return;
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			await this.messageService.sendError(message, `This song is already looping!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.SONG);

		await this.messageService.send(message, `Looping current song (${inlineCode(queue.nowPlaying.name)})!`);
	}

	async loopAll(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `I cannot loop the player when nothing is playing!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.QUEUE);

		await this.messageService.send(message, `Looping all song in the current playlist!`);
	}

	async unloop(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `I don't need to unloop anything : nothing is playing!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.DISABLED);

		await this.messageService.send(message, `Unlooped the current music playlist!`);
	}

	async shuffle(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `I cannot shuffle the queue when nothing is playing!`);
			return;
		}

		queue.shuffle();

		await this.messageService.send(message, `Shuffled the queue!`);
	}

	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	async viewQueue(message: Message, nbOfSongsToDisplay = 10) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `No queue here!`);
			return;
		}

		const formattedSongs = queue.songs
			.slice(0, nbOfSongsToDisplay)
			.map((song, i) => `${bold((i + 1).toString())} : ${inlineCode(song.name)}`);

		await this.messageService.send(message, {
			title: `Current queue`,
			description: formattedSongs.join('\n'),
			fields: [
				{
					name: 'Remaining songs',
					value: queue.songs.length.toString(),
					inline: true,
				},
			],
		});
	}

	async nowPlaying(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `Nothing is currently playing!`);
			return;
		}

		const song = queue.nowPlaying;

		const songData = { title: song.name, ...(song.data as SongData) };

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

		await this.messageService.send(message, {
			title: `Now playing : ${inlineCode(songData.title)}!`,
			thumbnail: {
				url: song.thumbnail,
			},
			fields: [
				{
					name: 'Requester',
					value: songData.requester.tag,
					inline: true,
				},
				{
					name: 'Author',
					value: song.author,
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
		});
	}
}
