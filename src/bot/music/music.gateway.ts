import { Controller, Logger } from '@nestjs/common';
import { Content, Context, On, OnCommand, TransformPipe, UseGuards, UsePipes, ValidationPipe } from 'discord-nestjs';
import { Message, VoiceState } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { LoopDto } from './dtos/loop.dto';
import { VolumeDto } from './dtos/volume.dto';
import { MusicGuard } from './guards/music.guard';
import { MusicService } from './services/music.service';

@Controller()
@UseGuards(MusicGuard)
export class MusicGateway {
	private readonly logger = new Logger(MusicGateway.name);

	constructor(private readonly musicService: MusicService) {}

	@On({ event: 'voiceStateUpdate' })
	async onUserDisconnect(@Context() [oldVoiceState, newVoiceState]: [VoiceState, VoiceState]) {
		// Only handle user leaving, not user joining
		if (newVoiceState.channelID) {
			return;
		}

		// Ignore bots
		if (oldVoiceState.member?.user.bot) {
			return;
		}

		const numberOfHumansRemaining = oldVoiceState.channel?.members.array().filter((m) => !m.user.bot).length;

		if (numberOfHumansRemaining !== 0) {
			return;
		}

		this.musicService.startAloneTimeout(oldVoiceState.guild);
	}

	@On({ event: 'voiceStateUpdate' })
	async onUserConnect(@Context() [oldVoiceState, newVoiceState]: [VoiceState, VoiceState]) {
		// Only handle user joining, not user leaving
		if (oldVoiceState.channelID) {
			return;
		}

		// Ignore bots
		if (newVoiceState.member?.user.bot) {
			return;
		}

		this.musicService.stopAloneTimeout(newVoiceState.guild);
	}

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
	@UsePipes(TransformPipe, ValidationPipe)
	async onLoop(@Content() { count }: LoopDto, @Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await message.channel.send('You need to be in a voice channel to loop a song!');
			return;
		}

		await this.musicService.loop(message, count);
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
