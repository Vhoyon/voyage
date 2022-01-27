import { InformError, InformErrorInfo, InformInternalError } from '$/bot/common/error/inform-error';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';

@Injectable()
export class BlacklistService {
	constructor(private readonly prisma: PrismaService) {}

	async blacklist(interaction: CommandInteraction) {
		const textChannel = interaction.channel;

		if (!textChannel || !interaction.guild) {
			throw new InformError(`You need to use this command in a server!`);
		}

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
					guildId: interaction.guild.id,
				},
			});

			return `Blacklisted this channel from accepting music commands!`;
		} catch (error) {
			throw new InformErrorInfo(`This channel was already blacklisted!`);
		}
	}

	async unblacklist(interaction: CommandInteraction) {
		const textChannel = interaction.channel;

		if (!textChannel || !interaction.guild) {
			throw new InformError(`You need to use this command in a server!`);
		}

		let count: number;

		try {
			const result = await this.prisma.musicBlacklistedChannel.deleteMany({
				where: {
					channelId: textChannel.id,
					guild: {
						guildId: interaction.guild.id,
					},
				},
			});

			count = result.count;
		} catch (error) {
			throw new InformInternalError(`An error happened while deleting the blacklisted channel from the database!`);
		}

		if (count > 0) {
			return `Unblocked this channel for accepting music commands!`;
		} else {
			throw new InformErrorInfo(`This channel was already free from sending music commands!`);
		}
	}
}
