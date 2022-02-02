import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { HistoryDto } from '../../dtos/history.dto';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'history',
	description: 'Shows the history of played songs',
})
@UseGuards(InteractionFromServer, MusicGuard)
@UsePipes(TransformPipe, ValidationPipe)
export class HistoryCommand implements DiscordTransformedCommand<HistoryDto> {
	private readonly logger = new Logger(HistoryCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { count }: HistoryDto, interaction: CommandInteraction) {
		const message = await this.messageService.send(interaction, `Fetching recent played songs from server...`);

		const reply = await this.musicService.history(interaction, count);

		await this.messageService.edit(message, reply);
	}
}
