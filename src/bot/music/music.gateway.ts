import { Injectable, Logger } from '@nestjs/common';
import { Content, Context, OnCommand } from 'discord-nestjs';
import { Message } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { MusicService } from './music.service';

@Injectable()
export class MusicGateway {
	private readonly logger = new Logger(MusicGateway.name);

	constructor(private readonly musicService: MusicService) {}

	@OnCommand({ name: 'play' })
	async onCommand(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
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
	// onCommandAlias(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
	// 	await message.channel.send(`Execute command: ${parsed}, Args: ${message}`);
	// 	return this.onCommand(parsed, [message]);
	// }
}
