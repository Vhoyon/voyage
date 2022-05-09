import { MessageService } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import type { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import type { ClientEvents } from 'discord.js';

/** The number of seconds to keep the blacklisted message and its command. */
export const BLACKLISTED_MESSAGE_RETENTION = 3;

@Injectable()
export class MusicGuard implements DiscordGuard {
	constructor(private readonly prisma: PrismaService, private readonly messageService: MessageService) {}

	async canActive(event: keyof ClientEvents, [interaction]: ClientEvents['interactionCreate']): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		if (!interaction.isCommand()) {
			return false;
		}

		if (!interaction.guild) {
			return false;
		}
		if (!interaction.channel) {
			return false;
		}

		const isBlacklistedChannel = await this.prisma.musicBlacklistedChannel.count({
			where: {
				channelId: interaction.channel.id,
				guild: {
					guildId: interaction.guild.id,
				},
			},
		});

		if (isBlacklistedChannel) {
			await this.messageService.sendError(interaction, `You can't use any music command on this channel!`);

			return false;
		}

		return true;
	}
}
