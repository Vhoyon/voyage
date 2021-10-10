import { ConfigModule } from '$common/configs/config.module';
import { EnvironmentConfig } from '$common/configs/env.validation';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DiscordModule } from 'discord-nestjs';
import { CommonModule } from './common/common.module';
import { DiscordConfigGateway } from './config/config.gateway';
import { MusicModule } from './music/music.module';
import { RequestPipe } from './utils/request.pipe';

export const discordModule = DiscordModule.forRootAsync({
	imports: [ConfigModule, PrismaModule, CommonModule],
	inject: [EnvironmentConfig],
	useFactory: async (env: EnvironmentConfig) => {
		const requestPipe = RequestPipe({
			commandPrefix: env.DISCORD_PREFIX,
		});

		return {
			intents: ['GUILD_VOICE_STATES'],
			token: env.DISCORD_TOKEN,
			commandPrefix: env.DISCORD_PREFIX,
			usePipes: [requestPipe],
			// usePipes: [TransformPipe, ValidationPipe],
		};
	},
});

@Module({
	imports: [discordModule, PrismaModule, MusicModule],
	controllers: [DiscordConfigGateway],
})
export class BotModule {}
