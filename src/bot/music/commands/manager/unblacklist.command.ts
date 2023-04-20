import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import type { CommandInteraction } from 'discord.js';
import { BlacklistService } from '../../services/blacklist.service';

@Command({
	name: 'free',
	description: 'Un-blacklists the channel this command is run in to allow using music commands',
})
@UseGuards(InteractionFromServer)
export class UnblacklistCommand implements DiscordCommand {
	private readonly logger = new Logger(UnblacklistCommand.name);

	constructor(private readonly messageService: MessageService, private readonly blacklistService: BlacklistService) {}

	async handler(interaction: CommandInteraction) {
		const reply = await this.blacklistService.unblacklist(interaction);

		await this.messageService.send(interaction, reply);
	}
}
