import { probability } from '$common/utils/funcs';
import { On } from '@discord-nestjs/core';
import { Controller, Logger } from '@nestjs/common';
import { VoiceState } from 'discord.js';
import { FRANCOIS_USER_ID, NICO_USER_ID } from '../constants/moms.ids';
import { JoinType, MomsMusicService } from './moms-music.service';

@Controller()
export class MomsMusicGateway {
	private readonly logger = new Logger(MomsMusicGateway.name);

	constructor(private readonly momsMusicService: MomsMusicService) {}

	@On('voiceStateUpdate')
	async onFrancoisJoin(oldVoiceState: VoiceState, newVoiceState: VoiceState) {
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

		await this.momsMusicService.playThemeIfAwayFor({
			voiceChannel: voiceState.channel,
			user: francoisMember.user,
			query,
			timeout: francoisTimeout,
			doCreateLog: (lastLogInTimeout) => {
				return !lastLogInTimeout || francoisMember == voiceState.member;
			},
		});
	}

	@On('voiceStateUpdate')
	async onNicoJoin(oldVoiceState: VoiceState, newVoiceState: VoiceState) {
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
	}
}
