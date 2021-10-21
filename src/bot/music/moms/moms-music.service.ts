import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { StageChannel, User, VoiceChannel } from 'discord.js';
import { PlayerService } from '../player/player.service';
import { PlayMusicOptions } from '../player/player.types';

export type OnMomJoinsOptions = {
	voiceChannel: VoiceChannel | StageChannel;
	user: User;
	query: string;
	/**
	 * Timeout in minutes before querying the play music command.
	 *
	 * Defaults to an hour.
	 */
	timeout?: number;
};

const DEFAULT_TIMEOUT = 60;

@Injectable()
export class MomsMusicService {
	private readonly logger = new Logger(MomsMusicService.name);

	constructor(private readonly player: PlayerService, private readonly prisma: PrismaService) {}

	async playThemeIfAwayFor<SongType, PlaylistType>(data: OnMomJoinsOptions, playOptions?: PlayMusicOptions<SongType, PlaylistType>) {
		const { voiceChannel, user, query, timeout } = data;

		const timeoutMs = (timeout ?? DEFAULT_TIMEOUT) * 60 * 1000;
		const lastLoggedDate = new Date(Date.now() - timeoutMs);

		const lastLogInTimeoutArray = await this.prisma.momsLog.findMany({
			take: 1,
			where: {
				userIdDiscord: user.id,
				guild: {
					guildId: voiceChannel.guild.id,
				},
				createdAt: {
					gt: lastLoggedDate,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		const lastLogInTimeout = lastLogInTimeoutArray.length ? lastLogInTimeoutArray[0] : null;

		const newMomLog = await this.prisma.momsLog.create({
			data: {
				userIdDiscord: user.id,
				guild: {
					connect: {
						guildId: voiceChannel.guild.id,
					},
				},
				didStartTheme: !lastLogInTimeout,
			},
		});

		const result = {
			lastLog: lastLogInTimeout,
			newLog: newMomLog,
		};

		if (lastLogInTimeout) {
			return result;
		}

		await this.player.play(query, voiceChannel, user, playOptions);

		return result;
	}
}
