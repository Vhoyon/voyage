import { PrismaModule } from '$common/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PlayerModule } from '../player/player.module';
import { MomsMusicGateway } from './moms-music.gateway';
import { MomsMusicService } from './moms-music.service';

@Module({
	imports: [PrismaModule, PlayerModule],
	controllers: [MomsMusicGateway],
	providers: [MomsMusicService],
	exports: [MomsMusicService],
})
export class MomsMusicModule {}
