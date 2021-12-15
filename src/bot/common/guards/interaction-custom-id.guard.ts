import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents, Interaction } from 'discord.js';

export const ButtonInteractionWithId = (id: string | { customId: string }) => {
	@Injectable()
	class ButtonInteractionWithIdGuard implements DiscordGuard {
		async canActive(event: keyof ClientEvents, [interaction]: [Interaction]): Promise<boolean> {
			const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

			if (!handlingEvents.includes(event)) {
				return true;
			}

			if (!interaction.isButton()) {
				return false;
			}

			if (typeof id == 'string') {
				return interaction.customId == id;
			} else {
				return interaction.customId == id.customId;
			}
		}
	}

	return ButtonInteractionWithIdGuard;
};
