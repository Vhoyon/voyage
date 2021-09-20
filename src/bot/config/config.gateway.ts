import { Injectable, Logger } from '@nestjs/common';
import { DiscordClientProvider, Once } from 'discord-nestjs';

@Injectable()
export class ConfigGateway {
	private readonly logger = new Logger(ConfigGateway.name);

	constructor(private readonly discordProvider: DiscordClientProvider) {}

	@Once({ event: 'ready' })
	onReady(): void {
		const botUser = this.discordProvider.getClient().user;

		this.logger.log(`Discord Bot : Logged in as ${botUser?.tag}!`);
	}
}
