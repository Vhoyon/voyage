import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents, GuildMember, Interaction } from 'discord.js';
import { MessageService } from '../message.service';

export const IsInVoiceChannel = (message = `You need to be in a voice channel to execute this action!`) => {
	@Injectable()
	class IsInVoiceChannelGuard implements DiscordGuard {
		constructor(private readonly messageService: MessageService) {}

		async canActive(event: keyof ClientEvents, [interaction]: [Interaction]): Promise<boolean> {
			const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

			if (!handlingEvents.includes(event)) {
				return true;
			}

			const member = interaction.member;

			if (!(member instanceof GuildMember)) {
				return false;
			}

			const voiceChannel = member.voice?.channel;

			if (!voiceChannel) {
				if (interaction.isButton() || interaction.isCommand()) {
					await this.messageService.sendError(interaction, message);
				}

				return false;
			}

			return true;
		}
	}

	return IsInVoiceChannelGuard;
};
