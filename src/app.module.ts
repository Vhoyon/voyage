import { ConfigModule } from '$common/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';

@Module({
	imports: [ConfigModule, PrismaModule, BotModule],
	providers: [],
})
export class AppModule {}
