import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BotModule, discordModule } from './bot/bot.module';

@Module({
	imports: [ConfigModule, PrismaModule, discordModule, BotModule],
	providers: [],
})
export class AppModule {}
