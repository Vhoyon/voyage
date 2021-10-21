import { Controller, Logger } from '@nestjs/common';
import { Context, On } from 'discord-nestjs';
import { VoiceState } from 'discord.js';
import { FRANCOIS_USER_ID } from '../constants/moms.ids';
import { MomsMusicService } from './moms-music.service';

@Controller()
export class MomsMusicGateway {
	private readonly logger = new Logger(MomsMusicGateway.name);

	constructor(private readonly momsMusicService: MomsMusicService) {}

	@On({ event: 'voiceStateUpdate' })
	async onFrancoisJoin(@Context() [oldVoiceState, newVoiceState]: [VoiceState, VoiceState]) {
		const newMember = newVoiceState.member;

		if (!newMember || newMember.user.bot) {
			return;
		}

		if (oldVoiceState.channel || !newVoiceState.channel) {
			// Only handle join events
			return;
		}

		const voiceUsers = newVoiceState.channel.members.filter((member) => !member.user.bot);

		const francoisMember = voiceUsers.find((member) => member.user.id == FRANCOIS_USER_ID);

		if (!francoisMember) {
			return;
		}

		if (voiceUsers.size <= 1) {
			// Do not log when Francois joins alone.
			return;
		}

		const numberOfDays = 7;

		const francoisTimeout = 60 * 24 * numberOfDays;

		// Victory song
		const query = 'https://www.youtube.com/watch?v=OLTZbJMQiD4';

		try {
			await this.momsMusicService.playThemeIfAwayFor({
				voiceChannel: newVoiceState.channel,
				user: francoisMember.user,
				query,
				timeout: francoisTimeout,
				doCreateLog: (lastLogInTimeout) => {
					return !lastLogInTimeout || francoisMember == newMember;
				},
			});
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
		}
	}
}
