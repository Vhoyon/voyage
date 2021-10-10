import { InformError } from '$/bot/common/error/inform-error';
import { GuildChannelsContext, MessageService } from '$/bot/common/message.service';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Player, Queue, RepeatMode, Song } from 'discord-music-player';
import { DiscordClientProvider } from 'discord-nestjs';
import { Message, TextChannel } from 'discord.js';

export type QueueData = {
	textChannel: TextChannel;
	isPaused?: boolean;
	lastPlayedSong?: Song;
	dynamicPlayer?: {
		type: PlayerType;
		interval: NodeJS.Timer;
	};
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export enum PlayerType {
	UPDATEABLE = 1,
	PINNED = 2,
}

export type MusicContext = GuildChannelsContext | Queue;

@Injectable()
export class PlayerService extends Player {
	private readonly logger = new Logger(PlayerService.name);

	constructor(
		readonly discordProvider: DiscordClientProvider,
		readonly env: EnvironmentConfig,
		private readonly prisma: PrismaService,
		private readonly messageService: MessageService,
	) {
		super(discordProvider.getClient(), {
			deafenOnJoin: true,
			leaveOnEnd: true,
			leaveOnEmpty: true,
			timeout: env.DISCORD_MUSIC_DISCONNECT_TIMEOUT * 1000,
		});

		this.on('songChanged', async (queue, newSong) => {
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
		});

		this.on('songChanged', async (queue, _newSong, oldSong) => {
			if (queue.repeatMode != RepeatMode.SONG) {
				(queue.data as QueueData).lastPlayedSong = oldSong;
			}
		});

		this.on('error', (error, queue) => {
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

	getQueueOf(of: MusicContext) {
		if (of instanceof Queue) {
			return of;
		}

		return of.guild && this.getQueue(of.guild.id);
	}

	async getOrCreateQueueOf(message: Message) {
		const queue = this.getQueueOf(message);

		if (!message.guild) {
			throw new InformError(`I can't play music from this channel! Make sure to be in a server.`);
		}

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

		const isNewQueue = !queue;

		const finalQueue =
			queue ??
			this.createQueue(message.guild.id, {
				data: {
					textChannel: message.channel,
				} as QueueData,
				volume: guildMusicSettings.volume,
			});

		return { queue: finalQueue, musicSettings: guildMusicSettings, isNewQueue };
	}
}
