import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe } from '$/bot/common/pipes/transform.pipe';
import { ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction, GuildMember } from 'discord.js';
import { QueueDto } from '../dtos/queue.dto';
import { MusicGuard } from '../guards/music.guard';
import { MusicService } from '../services/music.service';

@Command({
	name: 'queue',
	description: 'Gets a formatted version of the current queued songs',
})
@UseGuards(InteractionFromServer, MusicGuard)
@UsePipes(TransformPipe, ValidationPipe)
export class QueueCommand implements DiscordTransformedCommand<QueueDto> {
	private readonly logger = new Logger(QueueCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { count }: QueueDto, interaction: CommandInteraction) {
		const member = interaction.member;

		if (!(member instanceof GuildMember)) {
			return;
		}

		const voiceChannel = member.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(interaction, `You need to be in a voice channel to view the queue!`);
			return;
		}

		const reply = this.musicService.viewQueue(interaction, count);

		await this.messageService.send(interaction, reply);
	}
}
