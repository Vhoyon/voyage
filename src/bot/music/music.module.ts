import { Module } from '@nestjs/common';
import { MusicGateway } from './music.gateway';
import { MusicService } from './music.service';
import { YoutubeService } from './providers/youtube.service';

@Module({
	providers: [MusicGateway, MusicService, YoutubeService],
})
export class MusicModule {}
