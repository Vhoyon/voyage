import { Controller, Logger } from '@nestjs/common';
import { Content, Context, OnCommand, TransformPipe, UseGuards, UsePipes, ValidationPipe } from 'discord-nestjs';
import { Message } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { MessageIsFromTextChannelGuard } from '../common/guards/message-is-from-textchannel.guard';
import { VolumeDto } from './dtos/volume.dto';
import { MusicGuard } from './guards/music.guard';
import { MusicService } from './services/music.service';

@Controller()
@UseGuards(MessageIsFromTextChannelGuard, MusicGuard)
export class MusicGateway {
	private readonly logger = new Logger(MusicGateway.name);

	constructor(private readonly musicService: MusicService) {}

	@OnCommand({ name: 'play', aliases: ['p'] })
	async onPlay(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
		if (!parsed.content) {
			await message.channel.send('You need to provide a search query to this command!');
			return;
		}

		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to play music!');
			return;
		}

		const permissions = voiceChannel.permissionsFor(message.client.user!);

		if (!permissions?.has('CONNECT') || !permissions.has('SPEAK')) {
			await message.channel.send('I need the permissions to join and speak in your voice channel!');
			return;
		}

		try {
			await this.musicService.play(parsed.content, message);
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
			await message.channel.send(`An error happened!`);
		}
	}

	@OnCommand({ name: 'skip' })
	async onSkip(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to skip a song!');
			return;
		}

		await this.musicService.skip(message);
	}

	@OnCommand({ name: 'volume' })
	@UsePipes(TransformPipe, ValidationPipe)
	async onVolume(@Content() { volume }: VolumeDto, @Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send(`You need to be in a voice channel to set the music's volume!`);
			return;
		}

		const wasPlaying = await this.musicService.setVolume(message, volume);

		if (wasPlaying) {
			await message.channel.send(`Set volume to \`${volume}\`!`);
		} else {
			await message.channel.send(`Set volume to \`${volume}\` for the next time a song is played!`);
		}
	}

	@OnCommand({ name: 'disconnect' })
	async onDisconnect(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to stop me from playing music!');
			return;
		}

		await this.musicService.disconnect(message);
	}

	@OnCommand({ name: 'seek' })
	async onSeek(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
		if (!parsed.content) {
			await message.channel.send('You need to provide a timestamp (`##?:##?:##`) to this command!');
			return;
		}

		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to seek music!');
			return;
		}

		await this.musicService.seek(parsed.content, message);
	}

	@OnCommand({ name: 'loop' })
	async onLoop(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to loop a song!');
			return;
		}

		await this.musicService.loop(message);
	}

	@OnCommand({ name: 'loopall' })
	async onLoopall(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to loop the player!');
			return;
		}

		await this.musicService.loopAll(message);
	}

	@OnCommand({ name: 'unloop' })
	async onUnloop(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to unloop the music player!');
			return;
		}

		await this.musicService.unloop(message);
	}
}
