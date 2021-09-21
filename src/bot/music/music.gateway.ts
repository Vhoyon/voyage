import { Injectable, Logger } from '@nestjs/common';
import { Content, Context, OnCommand, TransformPipe, UsePipes, ValidationPipe } from 'discord-nestjs';
import { Message } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { VolumeDto } from './dtos/volume.dto';
import { MusicService } from './music.service';

@Injectable()
export class MusicGateway {
	private readonly logger = new Logger(MusicGateway.name);

	constructor(private readonly musicService: MusicService) {}

	@OnCommand({ name: 'play' })
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

		await this.musicService.play(parsed.content, message);
	}

	// @OnCommand({ name: 'p' })
	// onPlayAlias(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
	// 	// await message.channel.send(`Execute command: ${parsed}, Args: ${message}`);
	// 	return this.onCommand(parsed, [message]);
	// }

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

		this.musicService.setVolume(message, volume);
	}

	@OnCommand({ name: 'disconnect' })
	async onDisconnect(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
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
}
