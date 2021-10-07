import { InformErrorInfo, InformInternalError } from '$/bot/common/error/inform-error';
import { MessageService } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';

@Injectable()
export class BlacklistService {
	constructor(private readonly prisma: PrismaService, private readonly messageService: MessageService) {}

	async blacklist(message: Message) {
		const textChannel = message.channel;

		try {
			await this.prisma.guild.update({
				data: {
					musicBlacklistedChannels: {
						create: {
							channelId: textChannel.id,
						},
					},
				},
				where: {
					guildId: message.guild!.id,
				},
			});

			return `Blacklisted this channel from accepting music commands!`;
		} catch (error) {
			throw new InformErrorInfo(`This channel was already blacklisted!`);
		}
	}

	async unblacklist(message: Message) {
		const textChannel = message.channel;

		try {
			const { count } = await this.prisma.musicBlacklistedChannel.deleteMany({
				where: {
					channelId: textChannel.id,
					guild: {
						guildId: message.guild!.id,
					},
				},
			});

			if (count > 0) {
				return `Unblocked this channel for accepting music commands!`;
			} else {
				throw new InformErrorInfo(`This channel was already blacklisted!`);
			}
		} catch (error) {
			throw new InformInternalError(`An error happened while deleting the blacklisted channel from the database!`);
		}
	}
}
