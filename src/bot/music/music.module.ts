import { PrismaModule } from '$/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BlacklistGateway } from './blacklist.gateway';
import { MusicGateway } from './music.gateway';
import { MusicService } from './music.service';
import { YoutubeService } from './providers/youtube.service';
import { BlacklistService } from './blacklist.service';

@Module({
	imports: [PrismaModule],
	controllers: [MusicGateway, BlacklistGateway],
	providers: [MusicService, YoutubeService, BlacklistService],
})
export class MusicModule {}
