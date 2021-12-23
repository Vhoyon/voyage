import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction, GuildMember } from 'discord.js';
import { MusicGuard } from '../guards/music.guard';
import { MusicService } from '../services/music.service';

@Command({
	name: 'resume',
	description: 'Resumes the current song if player is paused',
})
@UseGuards(InteractionFromServer, MusicGuard)
export class ResumeCommand implements DiscordCommand {
	private readonly logger = new Logger(ResumeCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(interaction: CommandInteraction) {
		const member = interaction.member;

		if (!(member instanceof GuildMember)) {
			return;
		}

		const voiceChannel = member.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to resume music!');
			return;
		}

		const reply = this.musicService.resume(interaction);

		await this.messageService.send(interaction, reply);
	}
}
