import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { MessageService } from '$/bot/common/message.service';
import { Command, DiscordCommand, UseGuards } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { BlacklistService } from '../services/blacklist.service';

@Command({
	name: 'blacklist',
	description: 'Blacklists the channel this command is run in from using music commands',
})
@UseGuards(InteractionFromServer)
export class BlacklistCommand implements DiscordCommand {
	private readonly logger = new Logger(BlacklistCommand.name);

	constructor(private readonly messageService: MessageService, private readonly blacklistService: BlacklistService) {}

	async handler(interaction: CommandInteraction) {
		const reply = await this.blacklistService.blacklist(interaction);

		await this.messageService.send(interaction, reply);
	}
}
