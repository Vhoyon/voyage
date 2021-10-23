import { PrismaService } from '$common/prisma/prisma.service';
import { RequiredProperties } from '$common/utils/types';
import { MomsLog } from '.prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { StageChannel, User, VoiceChannel, VoiceState } from 'discord.js';
import { PlayerService } from '../player/player.service';
import { PlayMusicOptions } from '../player/player.types';

export enum JoinType {
	/**
	 * Handle the event by anyone who joins if the given user is present.
	 */
	ANYONE = 1,
	/**
	 * Only handle event that originates from the given user.
	 */
	ONLY_USER = 2,
}

export type GetMemberStateOptions = {
	userId: string;
	oldVoiceState: VoiceState;
	newVoiceState: VoiceState;
	/**
	 * Behavior of playing check.
	 *
	 * Defaults to `JoinType.ANYONE`.
	 */
	joinType?: JoinType;
};

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
	/**
	 * Defines if music should play or not (useful if the player should start based on a coin flip, for example).
	 *
	 * This will only be called if there was a possibility to play the theme music already, aka when there was no log in the defined timeout.
	 *
	 * Default to playing the theme song if not defined.
	 */
	doPlayMusic?: () => boolean;
};

export type VoiceStateChecked = RequiredProperties<VoiceState, 'channel' | 'member'>;

const DEFAULT_TIMEOUT = 60;

@Injectable()
export class MomsMusicService {
	private readonly logger = new Logger(MomsMusicService.name);

	constructor(private readonly player: PlayerService, private readonly prisma: PrismaService) {}

	getMemberState(data: GetMemberStateOptions) {
		const { userId, oldVoiceState, newVoiceState, joinType = JoinType.ANYONE } = data;

		if (oldVoiceState.channel || !newVoiceState.channel) {
			// Only handle join events
			return;
		}

		const joiningMember = newVoiceState.member;

		if (!joiningMember || joiningMember.user.bot) {
			return;
		}

		const voiceMembers = newVoiceState.channel.members.filter((member) => !member.user.bot);

		const member = voiceMembers.find((member) => member.user.id == userId);

		if (!member) {
			return;
		}

		switch (joinType) {
			case JoinType.ONLY_USER:
				if (member != joiningMember) {
					// Only handle event from given user.
					return;
				}
				break;
			default:
			case JoinType.ANYONE:
				if (voiceMembers.size <= 1) {
					// Do not handle when user joins alone.
					return;
				}
				break;
		}

		return {
			member,
			voiceState: newVoiceState as VoiceStateChecked,
		};
	}

	async playThemeIfAwayFor<SongType, PlaylistType>(data: OnMomJoinsOptions, playOptions?: PlayMusicOptions<SongType, PlaylistType>) {
		const { voiceChannel, user, query, timeout = DEFAULT_TIMEOUT, doCreateLog = true, doPlayMusic } = data;

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

		if (!lastLogInTimeout && (doPlayMusic?.() ?? true)) {
			await this.player.play(query, voiceChannel, user, playOptions);
		}

		return result;
	}
}
