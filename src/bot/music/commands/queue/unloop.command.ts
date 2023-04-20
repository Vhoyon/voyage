import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import type { CommandInteraction } from 'discord.js';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'unloop',
	description: 'Removes any loop that the music player can be in',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to unloop the music player!`))
export class UnloopCommand implements DiscordCommand {
	private readonly logger = new Logger(UnloopCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(interaction: CommandInteraction) {
		const reply = this.musicService.unloop(interaction);

		await this.messageService.send(interaction, reply);
	}
}
