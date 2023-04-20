import type { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import type { ClientEvents } from 'discord.js';
import { MessageService } from '../message.service';

@Injectable()
export class InteractionFromServer implements DiscordGuard {
	constructor(private readonly messageService: MessageService) {}

	async canActive(event: keyof ClientEvents, [interaction]: ClientEvents['interactionCreate']): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		const isFromServer = !!interaction.guild;

		if (!isFromServer && interaction.isCommand()) {
			await this.messageService.sendError(interaction, `I cannot use this command from this channel! Make sure to be in a server.`);
		}

		return isFromServer;
	}
}
