import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { PrismaModule } from '$common/prisma/prisma.module';
import { forwardRef, Module } from '@nestjs/common';
import { PlayerService } from './player.service';

@Module({
	imports: [PrismaModule, forwardRef(() => discordModule)],
	providers: [PlayerService, MessageService],
	exports: [PlayerService],
})
export class PlayerModule {}
