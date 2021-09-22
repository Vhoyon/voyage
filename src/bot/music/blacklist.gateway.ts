import { Controller, Logger } from '@nestjs/common';
import { Context, OnCommand } from 'discord-nestjs';
import { Message } from 'discord.js';
import { BlacklistService } from './services/blacklist.service';

@Controller()
export class BlacklistGateway {
	private readonly logger = new Logger(BlacklistGateway.name);

	constructor(private readonly blacklistService: BlacklistService) {}

	@OnCommand({ name: 'blacklist' })
	async onBlacklist(@Context() [message]: [Message]) {
		await this.blacklistService.blacklist(message);
	}

	@OnCommand({ name: 'free' })
	async onUnblacklist(@Context() [message]: [Message]) {
		await this.blacklistService.unblacklist(message);
	}
}
