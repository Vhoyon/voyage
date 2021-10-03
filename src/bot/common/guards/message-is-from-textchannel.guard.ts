import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DiscordGuard } from 'discord-nestjs';
import { ClientEvents, Message, TextChannel } from 'discord.js';

@Injectable()
export class MessageIsFromTextChannelGuard implements DiscordGuard {
	constructor(private readonly prisma: PrismaService) {}

	async canActive(event: keyof ClientEvents, [message]: [Message]): Promise<boolean> {
		const handlingEvents: (keyof ClientEvents)[] = ['message', 'messageCreate'];

		if (!handlingEvents.includes(event)) {
			return true;
		}

		const isMessageFromTextChannel = message.channel instanceof TextChannel;

		if (!isMessageFromTextChannel) {
			await message.channel.send(`Sorry, I can only do this command in a server!`);
		}

		return isMessageFromTextChannel;
	}
}
