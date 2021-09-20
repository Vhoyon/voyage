import { ConfigModule } from '$/config.module';
import { EnvironmentConfig } from '$/env.validation';
import { Module } from '@nestjs/common';
import { DiscordModule } from 'discord-nestjs';
import { ConfigGateway } from './config/config.gateway';
import { MusicModule } from './music/music.module';
import { RequestPipe } from './utils/request.pipe';

export const discordModule = DiscordModule.forRootAsync({
	imports: [ConfigModule],
	inject: [EnvironmentConfig],
	useFactory: async (env: EnvironmentConfig) => {
		const requestPipe = RequestPipe({
			commandPrefix: env.DISCORD_PREFIX,
		});

		return {
			token: env.DISCORD_TOKEN,
			commandPrefix: env.DISCORD_PREFIX,
			usePipes: [requestPipe],
			// usePipes: [TransformPipe, ValidationPipe],
		};
	},
});

@Module({
	imports: [discordModule, MusicModule],
	providers: [ConfigGateway],
})
export class BotModule {}
