import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
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
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to view the queue!`))
@UsePipes(TransformPipe, ValidationPipe)
export class HistoryCommand implements DiscordTransformedCommand<HistoryDto> {
	private readonly logger = new Logger(HistoryCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { count }: HistoryDto, interaction: CommandInteraction) {
		const reply = this.musicService.history(interaction, count);

		await this.messageService.send(interaction, reply);
	}
}
