import { probability } from '$common/utils/funcs';
import { Controller, Logger } from '@nestjs/common';
import { Context, On } from 'discord-nestjs';
import { VoiceState } from 'discord.js';
import { FRANCOIS_USER_ID, NICO_USER_ID } from '../constants/moms.ids';
import { JoinType, MomsMusicService } from './moms-music.service';

@Controller()
export class MomsMusicGateway {
	private readonly logger = new Logger(MomsMusicGateway.name);

	constructor(private readonly momsMusicService: MomsMusicService) {}

	@On({ event: 'voiceStateUpdate' })
	async onFrancoisJoin(@Context() [oldVoiceState, newVoiceState]: [VoiceState, VoiceState]) {
		const state = this.momsMusicService.getMemberState({
			userId: FRANCOIS_USER_ID,
			oldVoiceState,
			newVoiceState,
		});

		if (!state) {
			return;
		}

		const { member: francoisMember, voiceState } = state;

		const numberOfDays = 7;

		const francoisTimeout = 60 * 24 * numberOfDays;

		// "Victory" theme song
		const query = 'https://www.youtube.com/watch?v=E94f_b92wl4';

		try {
			await this.momsMusicService.playThemeIfAwayFor({
				voiceChannel: voiceState.channel,
				user: francoisMember.user,
				query,
				timeout: francoisTimeout,
				doCreateLog: (lastLogInTimeout) => {
					return !lastLogInTimeout || francoisMember == voiceState.member;
				},
			});
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
		}
	}

	@On({ event: 'voiceStateUpdate' })
	async onNicoJoin(@Context() [oldVoiceState, newVoiceState]: [VoiceState, VoiceState]) {
		const state = this.momsMusicService.getMemberState({
			userId: NICO_USER_ID,
			oldVoiceState,
			newVoiceState,
			joinType: JoinType.ONLY_USER,
		});

		if (!state) {
			return;
		}

		const { member: nicoMember, voiceState } = state;

		const numberOfMinutes = 30;

		// "Annoying" theme song
		const query = 'https://youtu.be/DvR6-SQzqO8';

		try {
			await this.momsMusicService.playThemeIfAwayFor({
				voiceChannel: voiceState.channel,
				user: nicoMember.user,
				query,
				timeout: numberOfMinutes,
				doCreateLog: (lastLogInTimeout) => {
					return !lastLogInTimeout || nicoMember == voiceState.member;
				},
				doPlayMusic: () => {
					const percentage = 33;

					return probability(percentage);
				},
			});
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
		}
	}
}
