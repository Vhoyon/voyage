import { TransformedRealCommandExecutionContext } from '$/bot/@types/discord-nestjs';
import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { MessageService } from '$/bot/common/message.service';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { SeekDto } from '../../dtos/seek.dto';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'seek',
	description: 'Seeks the current song to the given timestamp',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to seek music!`))
@UsePipes(TransformPipe, ValidationPipe)
export class SeekCommand implements DiscordTransformedCommand<SeekDto> {
	private readonly logger = new Logger(SeekCommand.name);

	constructor(private readonly messageService: MessageService, private readonly musicService: MusicService) {}

	async handler(@Payload() { timestamp }: SeekDto, { interaction }: TransformedRealCommandExecutionContext) {
		const reply = await this.musicService.seek(interaction, timestamp);

		await this.messageService.send(interaction, reply);
	}
}
