import { PrismaService } from '$/prisma.service';
import { PubSub } from '$/pub-sub';
import { Module } from '@nestjs/common';
import { MessageResolver } from './message.resolver';
import { MessageService } from './message.service';

@Module({
	providers: [PrismaService, MessageResolver, PubSub, MessageService],
})
export class MessageModule {}
