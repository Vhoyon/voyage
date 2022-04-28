import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents, TextChannel } from 'discord.js';
import { MessageService } from '../message.service';

@Injectable()
export class MessageIsFromTextChannelGuard implements DiscordGuard {
	constructor(private readonly messageService: MessageService) {}

	async canActive(event: keyof ClientEvents, [message]: ClientEvents['messageCreate']): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['message', 'messageCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		const isMessageFromTextChannel = message.channel instanceof TextChannel;

		if (!isMessageFromTextChannel) {
			await this.messageService.sendError(message, `Sorry, I can only do this command in a server!`);
		}

		return isMessageFromTextChannel;
	}
}
