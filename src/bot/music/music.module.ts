import { PrismaModule } from '$/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { BlacklistGateway } from './blacklist.gateway';
import { MusicGateway } from './music.gateway';
import { YoutubeProvider } from './providers/youtube.provider';
import { BlacklistService } from './services/blacklist.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule],
	controllers: [MusicGateway, BlacklistGateway],
	providers: [MusicService, BlacklistService, YoutubeProvider],
})
export class MusicModule {}
