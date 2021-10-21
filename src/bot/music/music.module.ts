import { PrismaModule } from '$common/prisma/prisma.module';
import { forwardRef, Module } from '@nestjs/common';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { BlacklistGateway } from './blacklist.gateway';
import { InteractionsGateway } from './interactions.gateway';
import { MomsMusicGateway } from './moms/moms-music.gateway';
import { MomsMusicService } from './moms/moms-music.service';
import { MusicGateway } from './music.gateway';
import { PlayerModule } from './player/player.module';
import { BlacklistService } from './services/blacklist.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule, forwardRef(() => discordModule), PlayerModule],
	controllers: [MusicGateway, BlacklistGateway, InteractionsGateway, MomsMusicGateway],
	providers: [MessageService, MusicService, BlacklistService, MomsMusicService],
})
export class MusicModule {}
