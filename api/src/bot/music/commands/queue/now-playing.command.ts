import type { TransformedRealCommandExecutionContext } from '$/bot/@types/discord-nestjs';
import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { IsInVoiceChannel } from '$/bot/common/guards/is-in-voicechannel.guard';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { NowPlayingDto } from '../../dtos/now-playing.dto';
import { MusicGuard } from '../../guards/music.guard';
import { MusicService } from '../../services/music.service';

@Command({
	name: 'np',
	description: 'Creates a new Now Playing widget, optionally dynamic',
})
@UseGuards(InteractionFromServer, MusicGuard, IsInVoiceChannel(`You need to be in a voice channel to see the current song!`))
@UsePipes(TransformPipe, ValidationPipe)
export class NowPlayingCommand implements DiscordTransformedCommand<NowPlayingDto> {
	private readonly logger = new Logger(NowPlayingCommand.name);

	constructor(private readonly musicService: MusicService) {}

	async handler(@Payload() { dynamicType }: NowPlayingDto, { interaction }: TransformedRealCommandExecutionContext) {
		await this.musicService.nowPlaying(interaction, {
			type: dynamicType,
		});
	}
}
