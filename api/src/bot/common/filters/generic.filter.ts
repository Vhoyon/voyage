import { Catch, DiscordArgumentMetadata, DiscordExceptionFilter } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { Interaction } from 'discord.js';
import { InformError, InformInternalError } from '../error/inform-error';
import { LogWarning } from '../error/log-warning';
import { MessageService } from '../message.service';

@Catch()
export class GenericErrorFilter implements DiscordExceptionFilter {
	private readonly logger = new Logger(GenericErrorFilter.name);

	constructor(private readonly messageService: MessageService) {}

	async catch(error: unknown, metadata: DiscordArgumentMetadata<'interaction' | 'interactionCreate'>) {
		if (error instanceof LogWarning) {
			error.log(this.logger);

			return;
		}

		const [interaction] = metadata.eventArgs;

		if (!(interaction instanceof Interaction)) {
			return;
		}

		if (!interaction.isCommand()) {
			return;
		}

		if (typeof error == 'string') {
			await this.messageService.sendError(interaction, error);

			return;
		}

		if (error instanceof InformError) {
			await this.messageService.sendError(interaction, error);

			return;
		}

		if (error instanceof Error) {
			this.logger.error(error, error.stack);
		} else {
			this.logger.error(`Unknown error type : ${error}`);
		}

		const sendableError = new InformInternalError(`An error happened!`, { error });

		await this.messageService.sendInternalError(interaction, sendableError);
	}
}
