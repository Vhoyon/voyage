import { MessageService } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { parseTimeIntoSeconds } from '$common/utils/funcs';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Queue, RepeatMode } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { Message, TextChannel } from 'discord.js';

export const VOLUME_LOG = 15;

export type QueueData = {
	textChannel: TextChannel;
	isPaused?: boolean;
};

export type SongData = {
	query: string;
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
						`Skipped \`${oldSong.name}\`. Now playing \`${newSong.name}\`!`,
					);
				}
			})
			.on('queueEnd', async (queue) => {
				const lastPlayedSong = queue.nowPlaying;

				if ((lastPlayedSong.data as SongData).skipped) {
					queue.destroy(true);
					await this.messageService.sendError(
						(queue.data as QueueData).textChannel,
						`Skipped \`${lastPlayedSong.name}\`. No more songs are the the queue, goodbye!`,
					);
				}
			})
			.on('channelEmpty', async (queue) => {
				this.messageService.send((queue.data as QueueData).textChannel, `Nobody's listening to me anymore, cya!`);
			})
			.on('error', (error, queue) => {
				if (typeof error == 'string') {
					if (error == 'Status code: 410') {
						this.messageService.sendError(
							(queue.data as QueueData).textChannel,
							`Couldn't play the given query. If you used a link, make sure the video / playlist is not private or age restricted!`,
						);
					} else {
						this.logger.error(`Error: ${error} in guild named "${queue.guild?.name}"`);
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
		});

		const botMessage = await this.messageService.send(message, `Searching for \`${query}\`...`);

		const hadSongs = queue.songs.length;

		try {
			if (isQuerySong) {
				const song = await queue.play(query);

				song.setData(createSongData());

				if (hadSongs) {
					await this.messageService.editEmbed(botMessage, `Added song \`${song.name}\` to the queue!`);
				} else {
					await this.messageService.editEmbed(botMessage, `Playing song \`${song.name}\`!`);
				}
			} else {
				const playlist = await queue.playlist(query);

				playlist.songs.forEach((s) => s.setData(createSongData()));

				if (hadSongs) {
					await this.messageService.editEmbed(
						botMessage,
						`Added playlist \`${playlist.name}\` (containing \`${playlist.songs.length}\` songs) to the queue!`,
					);
				} else {
					await this.messageService.editEmbed(
						botMessage,
						`Playing playlist \`${playlist.name}\` (containing \`${playlist.songs.length}\` songs)!`,
					);
				}
			}
		} catch (error) {
			await this.messageService.editEmbed(
				botMessage,
				`Couldn't find a match for the query \`${query}\`. If you used a link, make sure the video / playlist is not private!`,
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
				`Cannot skip currently looping song \`${queue.nowPlaying.name}\`. Use the \`unloop\` command first!`,
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
			await this.messageService.sendError(message, `The player is already paused! To resume the song, use the \`resume\` command!`);
			return;
		}

		queue.setPaused(true);
		(queue.data as QueueData).isPaused = true;

		await this.messageService.send(message, `Paused \`${queue.nowPlaying.name}\`!`);
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

		await this.messageService.send(message, `Resumed \`${queue.nowPlaying.name}\`!`);
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
				`You are trying to seek to a time greater than the song itself (\`${queue.nowPlaying.duration}\`). If you want to skip the song, use the skip command!`,
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

		await this.messageService.send(message, `Looping current song (\`${queue.nowPlaying.name}\`)!`);
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

		const formattedSongs = queue.songs.slice(0, nbOfSongsToDisplay).map((song, i) => `**${i + 1}** : \`${song.name}\``);

		await this.messageService.send(
			message,
			`Here's the next ${
				formattedSongs.length != nbOfSongsToDisplay ? formattedSongs.length : `${nbOfSongsToDisplay} (out of ${queue.songs.length})`
			} songs :\n\n${formattedSongs.join('\n')}`,
		);
	}

	async nowPlaying(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await this.messageService.sendError(message, `Nothing is currently playing!`);
			return;
		}

		const songTitle = queue.nowPlaying.name;
		const progressBar = queue.createProgressBar().prettier;

		await this.messageService.send(message, `Now playing : \`${songTitle}\`!\n\n\`${progressBar}\``);
	}
}
