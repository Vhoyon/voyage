import { PrismaService } from '$common/prisma/prisma.service';
import { MomsLog } from '.prisma/client';
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
	/**
	 * Defines if a log for the user provided should be created.
	 *
	 * Defaults to `true`.
	 */
	doCreateLog?: boolean | ((lastLogInTimeout: MomsLog | null) => boolean);
};

const DEFAULT_TIMEOUT = 60;

@Injectable()
export class MomsMusicService {
	private readonly logger = new Logger(MomsMusicService.name);

	constructor(private readonly player: PlayerService, private readonly prisma: PrismaService) {}

	async playThemeIfAwayFor<SongType, PlaylistType>(data: OnMomJoinsOptions, playOptions?: PlayMusicOptions<SongType, PlaylistType>) {
		const { voiceChannel, user, query, timeout = DEFAULT_TIMEOUT, doCreateLog = true } = data;

		const timeoutMs = timeout * 60 * 1000;
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

		const doIndeedCreateLog = typeof doCreateLog == 'boolean' ? doCreateLog : doCreateLog(lastLogInTimeout);

		const newMomLog = doIndeedCreateLog
			? await this.prisma.momsLog.create({
					data: {
						userIdDiscord: user.id,
						guild: {
							connect: {
								guildId: voiceChannel.guild.id,
							},
						},
						didStartTheme: !lastLogInTimeout,
					},
			  })
			: null;

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
