import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import type { CommandInteraction } from 'discord.js';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'skip',
	description: 'Skips the current song',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to skip a song!`))
export class SkipCommand implements DiscordCommand {
	private readonly logger = new Logger(SkipCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(interaction: CommandInteraction) {
		const reply = this.musicService.skip(interaction);

		await this.messageService.send(interaction, reply);
	}
}
