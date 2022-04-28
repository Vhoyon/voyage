import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { MessageService } from '../common/message.service';
import { InteractionsGateway } from './interactions.gateway';
import { MomsMusicModule } from './moms/moms-music.module';
import { PlayerModule } from './player/player.module';
import { PlayerService } from './player/player.service';
import { BlacklistService } from './services/blacklist.service';
import { ButtonService } from './services/button.service';
import { HistoryService } from './services/history.service';
import { MusicService } from './services/music.service';

const musicProviders = [MessageService, MusicService, PlayerService, BlacklistService, ButtonService, HistoryService];

@Module({
	imports: [PrismaModule, DiscordModule.forFeature(), PlayerModule, MomsMusicModule],
	controllers: [InteractionsGateway],
	providers: [...musicProviders],
	exports: [...musicProviders],
})
export class MusicModule {}
