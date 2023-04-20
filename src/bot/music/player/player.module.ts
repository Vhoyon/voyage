import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { ButtonService } from '../services/button.service';
import { HistoryService } from '../services/history.service';
import { PlayerService } from './player.service';

@Module({
	imports: [PrismaModule, DiscordModule.forFeature(), ConfigModule],
	providers: [PlayerService, MessageService, ButtonService, HistoryService],
	exports: [PlayerService],
})
export class PlayerModule {}
