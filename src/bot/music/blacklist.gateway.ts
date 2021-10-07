import { Controller, Logger } from '@nestjs/common';
import { Context, OnCommand, UseGuards } from 'discord-nestjs';
import { Message } from 'discord.js';
import { InformError } from '../common/error/inform-error';
import { MessageIsFromTextChannelGuard } from '../common/guards/message-is-from-textchannel.guard';
import { MessageService } from '../common/message.service';
import { BlacklistService } from './services/blacklist.service';

@Controller()
@UseGuards(MessageIsFromTextChannelGuard)
export class BlacklistGateway {
	private readonly logger = new Logger(BlacklistGateway.name);

	constructor(private readonly blacklistService: BlacklistService, private readonly messageService: MessageService) {}

	@OnCommand({ name: 'blacklist' })
	async onBlacklist(@Context() [message]: [Message]) {
		try {
			const reply = await this.blacklistService.blacklist(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'free' })
	async onUnblacklist(@Context() [message]: [Message]) {
		try {
			const reply = await this.blacklistService.unblacklist(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}
}
