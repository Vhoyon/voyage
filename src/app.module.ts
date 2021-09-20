import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { BotModule } from './bot/bot.module';

@Module({
	imports: [ConfigModule, BotModule],
	providers: [],
})
export class AppModule {}
