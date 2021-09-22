import { PrismaService } from '$/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Context, DiscordClientProvider, On, Once } from 'discord-nestjs';
import { Guild } from 'discord.js';

@Injectable()
export class DiscordConfigGateway {
	private readonly logger = new Logger(DiscordConfigGateway.name);

	constructor(private readonly discordProvider: DiscordClientProvider, private readonly prisma: PrismaService) {}

	@Once({ event: 'ready' })
	onReady() {
		const botUser = this.discordProvider.getClient().user;

		this.logger.log(`Logged in as ${botUser?.tag}!`);
	}

	@On({ event: 'guildCreate' })
	async onJoinGuild(@Context() [guild]: [Guild]) {
		await this.prisma.guild.create({
			data: {
				guildId: guild.id,
			},
		});

		this.logger.log(`Joined a new guild : "${guild.name}" (id: ${guild.id})!`);
	}

	@On({ event: 'guildDelete' })
	async onLeaveGuild(@Context() [guild]: [Guild]) {
		try {
			await this.prisma.guild.delete({
				where: {
					guildId: guild.id,
				},
			});

			this.logger.log(`Left guild : "${guild.name}" (id: ${guild.id}). Guild was deleted, I was kicked or I left by myself!`);
		} catch (error) {
			this.logger.warn(`Tried to leave guild "${guild.name}" (id: ${guild.id}) but a DB error happened.`);
		}
	}
}
