import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Content, Context, OnCommand } from 'discord-nestjs';
import { Message } from 'discord.js';
import { VParsedCommand } from 'vcommand-parser';
import { HelpService } from './help.service';

@Injectable()
export class HelpGateway implements OnModuleInit {
	private readonly logger = new Logger(HelpGateway.name);

	constructor(private readonly discoveryService: DiscoveryService, private readonly helpService: HelpService) {}

	async onModuleInit() {
		const providers: InstanceWrapper[] = this.discoveryService.getProviders();
		const controllers: InstanceWrapper[] = this.discoveryService.getControllers();

		await this.helpService.getCommandsDescriptions(providers, controllers);
	}

	@OnCommand({ name: 'help' })
	async onCommand(@Content() parsed: VParsedCommand, @Context() [message]: [Message]) {
		await message.channel.send(`Execute command: ${parsed}, Args: ${message}`);
	}
}
