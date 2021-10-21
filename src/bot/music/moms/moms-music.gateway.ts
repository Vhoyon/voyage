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
	async onFrancoisJoin(@Context() [oldChannel, newChannel]: [VoiceState, VoiceState]) {
		const newMember = newChannel.member;

		if (!newMember || newMember.user.bot) {
			return;
		}

		if (newMember.user.id != FRANCOIS_USER_ID) {
			return;
		}

		if (oldChannel.channel || !newChannel.channel) {
			return;
		}

		const numberOfDays = 7;

		const francoisTimeout = 60 * 24 * numberOfDays;

		try {
			await this.momsMusicService.playThemeIfAwayFor({
				voiceChannel: newChannel.channel,
				user: newMember.user,
				query: 'https://www.youtube.com/watch?v=OLTZbJMQiD4',
				timeout: francoisTimeout,
			});
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
		}
	}
}
