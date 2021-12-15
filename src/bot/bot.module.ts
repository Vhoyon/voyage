import { ConfigModule } from '$common/configs/config.module';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule, DiscordModuleAsyncOptions } from '@discord-nestjs/core';
import { RegisterCommandOptions } from '@discord-nestjs/core/dist/definitions/interfaces/register-command-options';
import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { CommandValidationFilter } from './common/filters/command-validation.filter';
import { GenericErrorFilter } from './common/filters/generic.filter';
import { DiscordConfigGateway } from './config/config.gateway';
import { MusicModule } from './music/music.module';

const imports: DiscordModuleAsyncOptions['imports'] = [ConfigModule, PrismaModule, CommonModule, MusicModule];

export const discordModule = DiscordModule.forRootAsync({
	imports,
	inject: [EnvironmentConfig],
	useFactory: async (env: EnvironmentConfig) => {
		const isProd = env.NODE_ENV == 'production';

		const devGuilds = env.DISCORD_DEV_GUILDS?.map(
			(guild): RegisterCommandOptions => ({
				forGuild: guild,
			}),
		);

		return {
			discordClientOptions: {
				intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'],
			},
			token: env.DISCORD_TOKEN,
			commands: ['**/*.command.js'],
			autoRegisterGlobalCommands: isProd,
			registerCommandOptions: devGuilds,
			useFilters: [CommandValidationFilter, GenericErrorFilter],
		};
	},
});

@Module({
	imports: [discordModule, PrismaModule],
	controllers: [DiscordConfigGateway],
})
export class BotModule {}
