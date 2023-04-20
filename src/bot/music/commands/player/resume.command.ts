import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import type { CommandInteraction } from 'discord.js';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'resume',
	description: 'Resumes the current song if player is paused',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to resume music!`))
export class ResumeCommand implements DiscordCommand {
	private readonly logger = new Logger(ResumeCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(interaction: CommandInteraction) {
		const reply = this.musicService.resume(interaction);

		await this.messageService.send(interaction, reply);
	}
}
