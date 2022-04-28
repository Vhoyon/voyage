import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents } from 'discord.js';

export const ButtonInteractionWithId = (id: string | { customId: string }) => {
	@Injectable()
	class ButtonInteractionWithIdGuard implements DiscordGuard {
		async canActive(event: keyof ClientEvents, [interaction]: ClientEvents['interactionCreate']): Promise<boolean> {
			const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

			if (!handlingEvents.includes(event)) {
				return true;
			}

			if (!interaction.isButton()) {
				return false;
			}

			const customId = typeof id == 'string' ? id : id.customId;

			return interaction.customId == customId;
		}
	}

	return ButtonInteractionWithIdGuard;
};
