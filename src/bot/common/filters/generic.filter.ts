import { Catch, DiscordArgumentMetadata, DiscordExceptionFilter } from '@discord-nestjs/core';
import { Logger } from '@nestjs/common';
import { InformError, InformInternalError } from '../error/inform-error';
import { MessageService } from '../message.service';

@Catch()
export class GenericErrorFilter implements DiscordExceptionFilter {
	private readonly logger = new Logger(GenericErrorFilter.name);

	constructor(private readonly messageService: MessageService) {}

	async catch(error: unknown, metadata: DiscordArgumentMetadata<'interactionCreate'>) {
		const [interaction] = metadata.context;

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
