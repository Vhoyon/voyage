import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction, GuildMember } from 'discord.js';
import { VolumeDto } from '../dtos/volume.dto';
import { MusicGuard } from '../guards/music.guard';
import { MusicService } from '../services/music.service';

@Command({
	name: 'volume',
	description: 'Sets the volume of the music bot for the server',
})
@UseGuards(InteractionFromServer, MusicGuard)
@UsePipes(TransformPipe, ValidationPipe)
export class VolumeCommand implements DiscordTransformedCommand<VolumeDto> {
	private readonly logger = new Logger(VolumeCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { volume }: VolumeDto, interaction: CommandInteraction) {
		const member = interaction.member;

		if (!(member instanceof GuildMember)) {
			return;
		}

		const voiceChannel = member.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(interaction, `You need to be in a voice channel to set the music's volume!`);
			return;
		}

		const wasPlaying = await this.musicService.setVolume(interaction, volume);

		if (wasPlaying) {
			await this.messageService.send(interaction, `Set volume to \`${volume}\`!`);
		} else {
			await this.messageService.send(interaction, `Set volume to \`${volume}\` for the next time a song is played!`);
		}
	}
}
