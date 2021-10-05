import { PrismaModule } from '$common/prisma/prisma.module';
import { forwardRef, Module } from '@nestjs/common';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { BlacklistGateway } from './blacklist.gateway';
import { MusicGateway } from './music.gateway';
import { BlacklistService } from './services/blacklist.service';
import { MusicService } from './services/music.service';

@Module({
	imports: [PrismaModule, forwardRef(() => discordModule)],
	controllers: [MusicGateway, BlacklistGateway],
	providers: [MusicService, BlacklistService, MessageService],
})
export class MusicModule {}
