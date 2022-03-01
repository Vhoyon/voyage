import { PrismaModule } from '$common/prisma/prisma.module';
import { forwardRef, Module } from '@nestjs/common';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { InteractionsGateway } from './interactions.gateway';
import { MomsMusicModule } from './moms/moms-music.module';
import { PlayerModule } from './player/player.module';
import { PlayerService } from './player/player.service';
import { BlacklistService } from './services/blacklist.service';
import { ButtonService } from './services/button.service';
import { HistoryService } from './services/history.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule, forwardRef(() => discordModule), PlayerModule, MomsMusicModule],
	controllers: [InteractionsGateway],
	providers: [MessageService, MusicService, PlayerService, BlacklistService, ButtonService, HistoryService],
	exports: [MessageService, MusicService, PlayerService, BlacklistService, ButtonService, HistoryService],
})
export class MusicModule {}
