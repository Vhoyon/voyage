import { On, UseGuards } from '@discord-nestjs/core';
import { Controller, Logger } from '@nestjs/common';
import { ButtonInteraction, GuildMember } from 'discord.js';
import { ButtonInteractionWithId } from '../common/guards/interaction-custom-id.guard';
import { IsChannelButtonInteractionGuard } from '../common/guards/is-channel-button-interaction.guard';
import { MessageService } from '../common/message.service';
import { MusicInteractionConstant } from './constants/music.constant';
import { PlayerService } from './player/player.service';
import { MusicService } from './services/music.service';

@Controller()
@UseGuards(IsChannelButtonInteractionGuard)
export class InteractionsGateway {
	private readonly logger = new Logger(InteractionsGateway.name);

	constructor(
		private readonly musicService: MusicService,
		private readonly messageService: MessageService,
		private readonly player: PlayerService,
	) {}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.LAST_SONG))
	async onLastPlayedInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to play the last played song!');
			return;
		}

		const reply = await this.musicService.playLastPlayedSong(interaction);

		await this.messageService.send(interaction, reply);

		this.player.updateDynamic(interaction);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.PLAY_PAUSE))
	async onPlayPauseInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to toggle play / pause!');
			return;
		}

		const reply = this.musicService.togglePause(interaction);

		await this.messageService.send(interaction, reply);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.SKIP))
	async onSkipInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to skip the song!');
			return;
		}

		const reply = this.musicService.skip(interaction);

		await this.messageService.send(interaction, reply);

		this.player.updateDynamic(interaction);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.REPEAT))
	async onRepeatInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to repeat the queue!');
			return;
		}

		const reply = this.musicService.toggleLoop(interaction);

		await this.messageService.send(interaction, reply);

		this.player.updateDynamic(interaction);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.REPEAT_ALL))
	async onRepeatAllInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to repeat the queue!');
			return;
		}

		const reply = this.musicService.toggleLoopAll(interaction);

		await this.messageService.send(interaction, reply);

		this.player.updateDynamic(interaction);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.DISCONNECT))
	async onDisconnectInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to disconnect the bot!');
			return;
		}

		const reply = await this.musicService.disconnect(interaction);

		await this.messageService.send(interaction, reply);
	}

	@On('interactionCreate')
	@UseGuards(ButtonInteractionWithId(MusicInteractionConstant.STOP_DYNAMIC_PLAYER))
	async onStopDynamicPlayerInteraction(interaction: ButtonInteraction) {
		if (interaction.member instanceof GuildMember && !interaction.member.voice.channel) {
			await this.messageService.sendError(interaction, 'You need to be in a voice channel to stop the dynamic player!');
			return;
		}

		const possibleType = await this.player.clearDynamic(interaction);

		if (possibleType) {
			await this.messageService.send(interaction, `Stopped the dynamic player!`);
		} else {
			await this.messageService.sendError(interaction, `The player is already not dynamic!`);
		}
	}
}
