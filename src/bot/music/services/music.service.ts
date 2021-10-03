import { EnvironmentConfig } from '$common/env.validation';
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

	constructor(readonly discordProvider: DiscordClientProvider, readonly env: EnvironmentConfig, private readonly prisma: PrismaService) {
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
					await (queue.data as QueueData).textChannel.send(`Skipped \`${oldSong.name}\`. Now playing \`${newSong.name}\`!`);
				}
			})
			.on('queueEnd', async (queue) => {
				const lastPlayedSong = queue.nowPlaying;

				if ((lastPlayedSong.data as SongData).skipped) {
					queue.destroy(true);
					await (queue.data as QueueData).textChannel.send(`Skipped \`${lastPlayedSong.name}\`. No more songs are the the queue, goodbye!`);
				}
			})
			.on('channelEmpty', async (queue) => {
				(queue.data as QueueData).textChannel.send(`Nobody's listening to me anymore, cya!`);
			})
			.on('error', (error, queue) => {
				if (typeof error == 'string') {
					if (error == 'Status code: 410') {
						(queue.data as QueueData).textChannel.send(
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

		const songData: SongData = {
			query,
		};

		await message.channel.send(`Searching for \`${query}\`...`);

		const hadSongs = queue.songs.length;

		try {
			if (isQuerySong) {
				const song = await queue.play(query);

				song.setData(songData);

				if (hadSongs) {
					await message.channel.send(`Added song \`${song.name}\` to the queue!`);
				} else {
					await message.channel.send(`Playing song \`${song.name}\`!`);
				}
			} else {
				const playlist = await queue.playlist(query);

				playlist.songs.forEach((s) => s.setData(songData));

				if (hadSongs) {
					await message.channel.send(`Added playlist \`${playlist.name}\` (containing \`${playlist.songs.length}\` songs) to the queue!`);
				} else {
					await message.channel.send(`Playing playlist \`${playlist.name}\` (containing \`${playlist.songs.length}\` songs)!`);
				}
			}
		} catch (error) {
			await message.channel.send(
				`Couldn't find a match for the query \`${query}\`. If you used a link, make sure the video / playlist is not private!`,
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
			await message.channel.send(`Play a song first before trying to skip it!`);
			return;
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			await message.channel.send(`Cannot skip currently looping song \`${queue.nowPlaying.name}\`. Use the \`unloop\` command first!`);
			return;
		}

		const songSkipped = queue.skip();

		(songSkipped.data as SongData).skipped = true;
	}

	async disconnect(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		queue.destroy(true);

		await message.channel.send(`Adios!`);
	}

	async pause(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (wasPaused) {
			await message.channel.send(`The player is already paused! To resume the song, use the \`resume\` command!`);
			return;
		}

		queue.setPaused(true);
		(queue.data as QueueData).isPaused = true;

		await message.channel.send(`Paused \`${queue.nowPlaying.name}\`!`);
	}

	async resume(message: Message) {
		const queue = this.getQueue(message);

		if (!queue) {
			// await message.channel.send(`I'm not even playing a song :/`);
			return;
		}

		const wasPaused = (queue.data as QueueData).isPaused;

		if (!wasPaused) {
			await message.channel.send(`There is no song to resume, play a song first!`);
			return;
		}

		queue.setPaused(false);
		(queue.data as QueueData).isPaused = false;

		await message.channel.send(`Resumed \`${queue.nowPlaying.name}\`!`);
	}

	async seek(timestamp: string, message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`I cannot seek through a song when nothing is playing...`);
			return;
		}

		const seekTime = parseTimeIntoSeconds(timestamp);
		const seekTimeMS = seekTime * 1000;

		if (seekTimeMS > queue.nowPlaying.millisecons) {
			await message.channel.send(
				`You are trying to seek to a time greater than the song itself (\`${queue.nowPlaying.duration}\`). If you want to skip the song, use the skip command!`,
			);
			return;
		}

		const seekedSong = await queue.seek(seekTimeMS);

		if (seekedSong == true) {
			await message.channel.send(`Seeked current song to ${timestamp}!`);
		}
	}

	async loop(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`I cannot set a looping song when nothing is playing!`);
			return;
		}

		if (queue.repeatMode == RepeatMode.SONG) {
			await message.channel.send(`This song is already looping!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.SONG);

		await message.channel.send(`Looping current song (\`${queue.nowPlaying.name}\`)!`);
	}

	async loopAll(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`I cannot loop the player when nothing is playing!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.QUEUE);

		await message.channel.send(`Looping all song in the current playlist!`);
	}

	async unloop(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`I don't need to unloop anything : nothing is playing!`);
			return;
		}

		queue.setRepeatMode(RepeatMode.DISABLED);

		await message.channel.send(`Unlooped the current music playlist!`);
	}

	async shuffle(message: Message) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`I cannot shuffle the queue when nothing is playing!`);
			return;
		}

		queue.shuffle();

		await message.channel.send(`Shuffled the queue!`);
	}

	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	async viewQueue(message: Message, nbOfSongsToDisplay = 10) {
		const queue = this.getQueue(message);

		if (!queue?.isPlaying) {
			await message.channel.send(`No queue here!`);
			return;
		}

		const formattedSongs = queue.songs.slice(0, nbOfSongsToDisplay).map((song, i) => `**${i + 1}** : \`${song.name}\``);

		await message.channel.send(
			`Here's the next ${
				formattedSongs.length != nbOfSongsToDisplay ? formattedSongs.length : `${nbOfSongsToDisplay} (out of ${queue.songs.length})`
			} songs :\n\n${formattedSongs.join('\n')}`,
		);
	}
}
