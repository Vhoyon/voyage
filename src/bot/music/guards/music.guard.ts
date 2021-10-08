import { MessageService } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DiscordGuard } from 'discord-nestjs';
import { ClientEvents, Message } from 'discord.js';

/** The number of seconds to keep the blacklisted message and its command. */
export const BLACKLISTED_MESSAGE_RETENTION = 3;

@Injectable()
export class MusicGuard implements DiscordGuard {
	constructor(private readonly prisma: PrismaService, private readonly messageService: MessageService) {}

	async canActive(event: keyof ClientEvents, [message]: [Message]): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['message', 'messageCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		const guild = await this.prisma.guild.findUnique({
			where: {
				guildId: message.guild!.id,
			},
			include: {
				musicBlacklistedChannels: true,
			},
		});

		if (guild?.musicBlacklistedChannels.some((blChannel) => blChannel.channelId == message.channel.id)) {
			const sendBlacklistedMessage = async () => {
				const sentMessage = await this.messageService.sendError(message, `You can't use any music command on this channel!`);

				setTimeout(async () => {
					if (sentMessage instanceof Message) {
						sentMessage.delete();
					}

					message.delete();
				}, BLACKLISTED_MESSAGE_RETENTION * 1000);
			};

			sendBlacklistedMessage();

			return false;
		}

		return true;
	}
}
