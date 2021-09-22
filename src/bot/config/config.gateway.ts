import { PrismaService } from '$/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Context, DiscordClientProvider, On, Once } from 'discord-nestjs';
import { Guild } from 'discord.js';

@Injectable()
export class DiscordConfigGateway {
	private readonly logger = new Logger(DiscordConfigGateway.name);

	constructor(private readonly discordProvider: DiscordClientProvider, private readonly prisma: PrismaService) {}

	@Once({ event: 'ready' })
	async onReady() {
		const client = this.discordProvider.getClient();

		this.logger.log(`Logged in as ${client.user?.tag}!`);

		await Promise.all(
			client.guilds.cache.map(async (guild) => {
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
			}),
		);
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
