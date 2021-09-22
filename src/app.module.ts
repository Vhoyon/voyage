import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { ConfigModule } from './config.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
	imports: [ConfigModule, PrismaModule, BotModule],
	providers: [],
})
export class AppModule {}
