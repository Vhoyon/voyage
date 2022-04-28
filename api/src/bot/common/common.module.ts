import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { MessageService } from './message.service';

@Module({
	imports: [DiscordModule.forFeature()],
	providers: [MessageService],
	exports: [MessageService],
})
export class CommonModule {}
