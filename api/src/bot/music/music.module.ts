import { PrismaModule } from '$common/prisma/prisma.module';
import { forwardRef, Module } from '@nestjs/common';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { InteractionsGateway } from './interactions.gateway';
import { MomsMusicGateway } from './moms/moms-music.gateway';
import { MomsMusicService } from './moms/moms-music.service';
import { PlayerModule } from './player/player.module';
import { PlayerService } from './player/player.service';
import { BlacklistService } from './services/blacklist.service';
import { ButtonService } from './services/button.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule, forwardRef(() => discordModule), PlayerModule],
	controllers: [InteractionsGateway, MomsMusicGateway],
	providers: [MessageService, MusicService, PlayerService, MomsMusicService, BlacklistService, ButtonService],
	exports: [MessageService, MusicService, PlayerService, MomsMusicService, BlacklistService, ButtonService],
})
export class MusicModule {}
