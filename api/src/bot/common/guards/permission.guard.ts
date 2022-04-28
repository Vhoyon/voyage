import { DiscordGuard } from '@discord-nestjs/core';
import { Injectable } from '@nestjs/common';
import { ClientEvents, DMChannel, GuildMember, Interaction, PartialDMChannel, PermissionResolvable, TextBasedChannel } from 'discord.js';
import { MessageService } from '../message.service';

function channelIsPartialDM(channel: TextBasedChannel): channel is PartialDMChannel | DMChannel {
	return channel.type == 'DM';
}

export const TextPermissionChecker = (permissions: PermissionResolvable[], message = 'Not authorized.') => {
	@Injectable()
	class TextPermissionGuard implements DiscordGuard {
		constructor(private readonly messageService: MessageService) {}

		async canActive(event: keyof ClientEvents, [interaction]: [Interaction]): Promise<boolean> {
			const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

			if (!handlingEvents.includes(event)) {
				return true;
			}

			const member = interaction.member;

			if (!(member instanceof GuildMember)) {
				return false;
			}

			const channel = interaction.channel;

			if (!channel || channelIsPartialDM(channel)) {
				return this.errorSender(interaction, `Interaction needs to be in a text channel as it is protected!`);
			}

			const channelPerms = channel.permissionsFor(interaction.client.user!);

			if (!channelPerms) {
				return this.errorSender(interaction, `No permission set, defaulting to not allowed!`);
			}

			const hasOnePermNotAvailable = permissions.some((perm) => !channelPerms.has(perm));

			if (hasOnePermNotAvailable) {
				return this.errorSender(interaction, message);
			}

			return true;
		}

		async errorSender(interaction: Interaction, message: string) {
			if (interaction.isButton() || interaction.isCommand()) {
				await this.messageService.sendError(interaction, message);
			}

			return false;
		}
	}

	return TextPermissionGuard;
};

export const VoicePermissionChecker = (permissions: PermissionResolvable[], message = 'Not authorized.') => {
	@Injectable()
	class VoicePermissionGuard implements DiscordGuard {
		constructor(private readonly messageService: MessageService) {}

		async canActive(event: keyof ClientEvents, [interaction]: [Interaction]): Promise<boolean> {
			const handlingEvents: (keyof ClientEvents)[] = ['interaction', 'interactionCreate'];

			if (!handlingEvents.includes(event)) {
				return true;
			}

			const member = interaction.member;

			if (!(member instanceof GuildMember)) {
				return false;
			}

			const voiceChannel = member.voice?.channel;

			if (!voiceChannel) {
				return this.errorSender(interaction, `You need to be in a voice channel to perform this action!`);
			}

			const channelPerms = voiceChannel.permissionsFor(interaction.client.user!);

			if (!channelPerms) {
				return this.errorSender(interaction, `No permission set, defaulting to not allowed!`);
			}

			const hasOnePermNotAvailable = permissions.some((perm) => !channelPerms.has(perm));

			if (hasOnePermNotAvailable) {
				return this.errorSender(interaction, message);
			}

			return true;
		}

		async errorSender(interaction: Interaction, message: string) {
			if (interaction.isButton() || interaction.isCommand()) {
				await this.messageService.sendError(interaction, message);
			}

			return false;
		}
	}

	return VoicePermissionGuard;
};
