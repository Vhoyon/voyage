import { PrismaModule } from '$/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BlacklistGateway } from './blacklist.gateway';
import { MusicGateway } from './music.gateway';
import { YoutubeService } from './providers/youtube.service';
import { BlacklistService } from './services/blacklist.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule],
	controllers: [MusicGateway, BlacklistGateway],
	providers: [MusicService, YoutubeService, BlacklistService],
})
export class MusicModule {}
