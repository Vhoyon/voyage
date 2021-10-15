import { Controller, Logger } from '@nestjs/common';
import { Context, On } from 'discord-nestjs';
import { GuildMember, Interaction, TextChannel } from 'discord.js';
import { MessageService } from '../common/message.service';
import { MusicInteractionConstant } from './music.constant';
import { MusicService } from './services/music.service';
import { PlayerService } from './services/player.service';

@Controller()
export class InteractionsGateway {
	private readonly logger = new Logger(InteractionsGateway.name);

	constructor(
		private readonly musicService: MusicService,
		private readonly messageService: MessageService,
		private readonly playerService: PlayerService,
	) {}

	@On({ event: 'interactionCreate' })
	async onLastPlayedInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.LAST_SONG) {
			return;
		}

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to play the last played song!');
			return;
		}

		try {
			const reply = await this.musicService.playLastPlayedSong(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
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

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to toggle play / pause!');
			return;
		}

		try {
			const reply = this.musicService.togglePause(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
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

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to skip the song!');
			return;
		}

		try {
			const reply = this.musicService.skip(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
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

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to repeat the queue!');
			return;
		}

		try {
			const reply = this.musicService.toggleLoop(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
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

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to repeat the queue!');
			return;
		}

		try {
			const reply = this.musicService.toggleLoopAll(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
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

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to disconnect the bot!');
			return;
		}

		try {
			const reply = await this.musicService.disconnect(interaction);

			await this.messageService.send(interaction, reply);
		} catch (error) {
			await this.messageService.sendError(interaction, error);
		}
	}

	@On({ event: 'interactionCreate' })
	async onStopDynamicPlayerInteraction(@Context() [interaction]: [Interaction]) {
		if (!interaction.isButton() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
			return;
		}

		if (interaction.customId != MusicInteractionConstant.STOP_DYNAMIC_PLAYER) {
			return;
		}

		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to stop the dynamic player!');
			return;
		}

		try {
			const possibleType = await this.playerService.clearDynamic(interaction);

			if (possibleType) {
				await this.messageService.send(interaction, `Stopped the dynamic player!`);
			} else {
				await this.messageService.sendError(interaction, `The player is already not dynamic!`);
			}
		} catch (error) {
			await this.messageService.sendError(interaction, error);
		}
	}
}
