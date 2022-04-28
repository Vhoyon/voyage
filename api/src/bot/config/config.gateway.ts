import { PrismaService } from '$common/prisma/prisma.service';
import { InjectDiscordClient, On } from '@discord-nestjs/core';
import { Controller, Logger } from '@nestjs/common';
import { Client, Guild } from 'discord.js';

@Controller()
export class DiscordConfigGateway {
	private readonly logger = new Logger(DiscordConfigGateway.name);

	constructor(
		@InjectDiscordClient()
		private readonly client: Client,
		private readonly prisma: PrismaService,
	) {}

	@On('shardReady')
	async onReady() {
		if (this.client.user) {
			this.logger.log(`Logged in as ${this.client.user.tag}!`);
		} else {
			this.logger.error(`Bot user is not defined in the client!`);
		}

		const guildCreations = this.client.guilds.cache.map(async (guild) => {
			const pGuild = await this.prisma.guild.findUnique({
				where: {
					guildId: guild.id,
				},
			});

			if (!pGuild) {
				return await this.prisma.guild.create({
					data: {
						guildId: guild.id,
					},
				});
			}
		});

		await Promise.all(guildCreations);
	}

	@On('shardReady')
	async onReadySetActivity() {
		this.client.user?.setActivity({
			type: 'LISTENING',
			name: `Moosic | Use / commands!`,
		});
	}

	@On('guildCreate')
	async onJoinGuild(guild: Guild) {
		await this.prisma.guild.create({
			data: {
				guildId: guild.id,
			},
		});

		this.logger.log(`Joined a new guild : "${guild.name}" (id: ${guild.id})!`);
	}

	@On('guildDelete')
	async onLeaveGuild(guild: Guild) {
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
