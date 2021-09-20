import { ConfigModule } from '$/config.module';
import { Module } from '@nestjs/common';
import { MusicGateway } from './music.gateway';
import { MusicService } from './music.service';

@Module({
	imports: [ConfigModule],
	providers: [MusicGateway, MusicService],
})
export class MusicModule {}
