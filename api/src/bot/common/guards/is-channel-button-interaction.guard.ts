import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents, Interaction, TextChannel } from 'discord.js';

@Injectable()
export class IsChannelButtonInteractionGuard implements DiscordGuard {
	async canActive(event: keyof ClientEvents, [interaction]: [Interaction]): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		const isButtonInteraction = interaction.isButton();
		const hasProperChannel = !!interaction.channel && interaction.channel instanceof TextChannel;

		return isButtonInteraction && hasProperChannel;
	}
}
