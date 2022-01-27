import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { VolumeDto } from '../dtos/volume.dto';
import { MusicGuard } from '../guards/music.guard';
import { MusicService } from '../services/music.service';

@Command({
	name: 'volume',
	description: 'Sets the volume of the music bot for the server',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to set the music's volume!`))
@UsePipes(TransformPipe, ValidationPipe)
export class VolumeCommand implements DiscordTransformedCommand<VolumeDto> {
	private readonly logger = new Logger(VolumeCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { volume }: VolumeDto, interaction: CommandInteraction) {
		const wasPlaying = await this.musicService.setVolume(interaction, volume);

		if (wasPlaying) {
			await this.messageService.send(interaction, `Set volume to \`${volume}\`!`);
		} else {
			await this.messageService.send(interaction, `Set volume to \`${volume}\` for the next time a song is played!`);
		}
	}
}
