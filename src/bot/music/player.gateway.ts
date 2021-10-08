import { Controller, Logger } from '@nestjs/common';
import { Context, On } from 'discord-nestjs';
import { Interaction, TextChannel } from 'discord.js';
import { InformError } from '../common/error/inform-error';
import { MessageService } from '../common/message.service';
import { MusicInteractionConstant } from './music.constant';
import { MusicService } from './services/music.service';

@Controller()
export class PlayerGateway {
	private readonly logger = new Logger(PlayerGateway.name);

	constructor(private readonly musicService: MusicService, private readonly messageService: MessageService) {}

	@On({ event: 'interactionCreate' })
	async onLastPlayedInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.LAST_SONG) {
			return;
		}

		try {
			const reply = await this.musicService.playLastPlayedSong(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
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
			const reply = this.musicService.togglePause(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
		}
	}

	@On({ event: 'interactionCreate' })
	async onSkipInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.SKIP) {
			return;
		}

		try {
			const reply = this.musicService.skip(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
		}
	}

	@On({ event: 'interactionCreate' })
	async onRepeatInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.REPEAT) {
			return;
		}

		try {
			const reply = this.musicService.toggleLoop(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
		}
	}

	@On({ event: 'interactionCreate' })
	async onRepeatAllInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.REPEAT_ALL) {
			return;
		}

		try {
			const reply = this.musicService.toggleLoopAll(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
		}
	}

	@On({ event: 'interactionCreate' })
	async onDisconnectInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.DISCONNECT) {
			return;
		}

		try {
			const reply = this.musicService.disconnect(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			if (error instanceof InformError) {
				await this.messageService.sendError(interaction, error);
			}
		}
	}
}
