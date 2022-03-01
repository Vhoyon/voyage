import { PrismaService } from '$common/prisma/prisma.service';
import { DiscordClientProvider, On, Once } from '@discord-nestjs/core';
import { Controller, Logger } from '@nestjs/common';
import { Guild } from 'discord.js';

@Controller()
export class DiscordConfigGateway {
	private readonly logger = new Logger(DiscordConfigGateway.name);

	constructor(private readonly discordProvider: DiscordClientProvider, private readonly prisma: PrismaService) {}

	@Once('ready')
	async onReady() {
		const client = this.discordProvider.getClient();

		this.logger.log(`Logged in as ${client.user?.tag}!`);

		const guildCreations = client.guilds.cache.map(async (guild) => {
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

	@On('ready')
	async onReadySetActivity() {
		const client = this.discordProvider.getClient();

		client.user?.setActivity({
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
