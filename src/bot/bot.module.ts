import { ConfigModule } from '$/config.module';
import { EnvironmentConfig } from '$/env.validation';
import { PrismaModule } from '$/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DiscordModule } from 'discord-nestjs';
import { DiscordConfigGateway } from './config/config.gateway';
import { MusicModule } from './music/music.module';
import { RequestPipe } from './utils/request.pipe';

export const discordModule = DiscordModule.forRootAsync({
	imports: [ConfigModule, PrismaModule],
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
	providers: [DiscordConfigGateway],
})
export class BotModule {}
