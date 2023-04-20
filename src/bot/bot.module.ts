import { env } from '$common/configs';
import { ConfigModule } from '$common/configs/config.module';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaModule } from '$common/prisma/prisma.module';
import { COMMAND_DECORATOR, DiscordModule, registerFilterGlobally } from '@discord-nestjs/core';
import type { RegisterCommandOptions } from '@discord-nestjs/core/dist/definitions/interfaces/register-command-options';
import { Module } from '@nestjs/common';
import { InjectDynamicProviders, IsObject } from 'nestjs-dynamic-providers';
import { CommonModule } from './common/common.module';
import { CommandValidationFilter } from './common/filters/command-validation.filter';
import { GenericErrorFilter } from './common/filters/generic.filter';
import { DiscordConfigGateway } from './config/config.gateway';
import { MusicModule } from './music/music.module';

// const discordImports: DiscordModuleAsyncOptions['imports'] = [PrismaModule, CommonModule, MusicModule];

export const discordModule = DiscordModule.forRootAsync({
	imports: [ConfigModule],
	inject: [EnvironmentConfig],
	useFactory: async (_env: EnvironmentConfig) => {
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
			autoRegisterGlobalCommands: isProd,
			registerCommandOptions: devGuilds,
		};
	},
});

@InjectDynamicProviders({
	pattern: '**/*.command.js',
	filterPredicate: (type) => {
		return IsObject(type) && Reflect.hasMetadata(COMMAND_DECORATOR, type.prototype);
	},
})
@Module({
	imports: [ConfigModule, DiscordModule.forFeature(), PrismaModule, CommonModule, MusicModule],
	controllers: [DiscordConfigGateway],
	providers: [
		{
			provide: registerFilterGlobally(),
			useClass: CommandValidationFilter,
		},
		{
			provide: registerFilterGlobally(),
			useClass: GenericErrorFilter,
		},
	],
})
export class BotModule {}
