import { Controller, Logger } from '@nestjs/common';
import { Content, Context, On, OnCommand, TransformPipe, UseGuards, UsePipes, ValidationPipe } from 'discord-nestjs';
import { Interaction, Message, TextChannel } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { InformError } from '../common/error/inform-error';
import { MessageIsFromTextChannelGuard } from '../common/guards/message-is-from-textchannel.guard';
import { MessageService } from '../common/message.service';
import { QueueDto } from './dtos/queue.dto';
import { VolumeDto } from './dtos/volume.dto';
import { MusicGuard } from './guards/music.guard';
import { MusicInteractionConstant } from './music.constant';
import { MusicService } from './services/music.service';

@Controller()
@UseGuards(MessageIsFromTextChannelGuard, MusicGuard)
export class MusicGateway {
	private readonly logger = new Logger(MusicGateway.name);

	constructor(private readonly musicService: MusicService, private readonly messageService: MessageService) {}

	@OnCommand({ name: 'play', aliases: ['p'] })
	async onPlay(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
		if (!parsed.content) {
			await this.messageService.sendError(message, 'You need to provide a search query to this command!');
			return;
		}

		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to play music!');
			return;
		}

		const permissions = voiceChannel.permissionsFor(message.client.user!);

		if (!permissions?.has('CONNECT') || !permissions.has('SPEAK')) {
			await this.messageService.sendError(message, 'I need the permissions to join and speak in your voice channel!');
			return;
		}

		try {
			await this.musicService.play(parsed.content, message);
		} catch (error) {
			this.logger.error(error, error instanceof TypeError ? error.stack : undefined);
			await this.messageService.sendError(message, `An error happened!`);
		}
	}

	@On({ event: 'interactionCreate' })
	async onPlayPauseInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.PLAY_PAUSE) {
			return;
		}

		try {
			const reply = this.musicService.togglePause(interaction.channel);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction.channel, error);
			}
		}
	}

	@OnCommand({ name: 'skip' })
	async onSkip(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to skip a song!');
			return;
		}

		try {
			this.musicService.skip(message);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
				return;
			}
		}
	}

	@OnCommand({ name: 'volume' })
	@UsePipes(TransformPipe, ValidationPipe)
	async onVolume(@Content() { volume }: VolumeDto, @Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, `You need to be in a voice channel to set the music's volume!`);
			return;
		}

		const wasPlaying = await this.musicService.setVolume(message, volume);

		if (wasPlaying) {
			await this.messageService.send(message, `Set volume to \`${volume}\`!`);
		} else {
			await this.messageService.send(message, `Set volume to \`${volume}\` for the next time a song is played!`);
		}
	}

	@OnCommand({ name: 'disconnect' })
	async onDisconnect(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to stop me from playing music!');
			return;
		}

		try {
			const reply = this.musicService.disconnect(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'pause' })
	async onPause(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to pause music!');
			return;
		}

		try {
			const reply = this.musicService.pause(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'resume' })
	async onResume(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to resume music!');
			return;
		}

		try {
			const reply = this.musicService.resume(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'seek' })
	async onSeek(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
		if (!parsed.content) {
			await this.messageService.sendError(message, 'You need to provide a timestamp (`##?:##?:##`) to this command!');
			return;
		}

		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to seek music!');
			return;
		}

		try {
			const reply = await this.musicService.seek(parsed.content, message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'loop' })
	async onLoop(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to loop a song!');
			return;
		}

		try {
			const reply = this.musicService.loop(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'loopall' })
	async onLoopall(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to loop the player!');
			return;
		}

		try {
			const reply = this.musicService.loopAll(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'unloop' })
	async onUnloop(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to unloop the music player!');
			return;
		}

		try {
			const reply = this.musicService.unloop(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'shuffle' })
	async onShuffle(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to shuffle the queued songs!');
			return;
		}

		try {
			const reply = this.musicService.shuffle(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'queue' })
	@UsePipes(TransformPipe, ValidationPipe)
	async onGetQueue(@Content() { count }: QueueDto, @Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to view the queue!');
			return;
		}

		try {
			const reply = this.musicService.viewQueue(message, count);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}

	@OnCommand({ name: 'np' })
	async onNowPlaying(@Context() [message]: [Message]) {
		const voiceChannel = message.member?.voice?.channel;

		if (!voiceChannel) {
			await this.messageService.sendError(message, 'You need to be in a voice channel to see the current song!');
			return;
		}

		try {
			const reply = this.musicService.nowPlaying(message);

			await this.messageService.send(message, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(message, error);
			}
		}
	}
}
