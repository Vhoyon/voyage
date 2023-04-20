import type { TransformedRealCommandExecutionContext } from '$/bot/@types/discord-nestjs';
import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordClientProvider, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import type { TextChannel } from 'discord.js';
import { HistoryDto } from '../../dtos/history.dto';
import { MusicGuard } from '../../guards/music.guard';
import { HistoryService } from '../../services/history.service';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'history',
	description: 'Shows the history of played songs',
})
@UseGuards(InteractionFromServer, MusicGuard)
@UsePipes(TransformPipe, ValidationPipe)
export class HistoryCommand implements DiscordTransformedCommand<HistoryDto> {
	private readonly logger = new Logger(HistoryCommand.name);

	constructor(
		private readonly messageService: MessageService,
		private readonly musicService: MusicService,
		private readonly discordProvider: DiscordClientProvider,
		private readonly historyService: HistoryService,
	) {}

	async handler(@Payload() { count, userId }: HistoryDto, { interaction }: TransformedRealCommandExecutionContext) {
		const client = this.discordProvider.getClient();

		const user = userId ? await client.users.fetch(userId) : undefined;

		const message = await this.messageService.send(interaction, `Fetching recent played songs from server...`);

		const reply = await this.musicService.history(interaction, { count, user });

		const historyMessage = await this.messageService.edit(message, reply);

		if (!user) {
			this.historyService.setHistoryMessage(interaction.channel as TextChannel, historyMessage);
		}
	}
}
