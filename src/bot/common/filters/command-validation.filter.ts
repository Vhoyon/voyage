import { Catch, DiscordArgumentMetadata, DiscordExceptionFilter } from '@discord-nestjs/core';
import { ValidationError } from 'class-validator';
import { EmbedFieldData } from 'discord.js';
import { MessageService } from '../message.service';

@Catch(ValidationError)
export class CommandValidationFilter implements DiscordExceptionFilter {
	constructor(private readonly messageService: MessageService) {}

	async catch(exceptionList: ValidationError[], metadata: DiscordArgumentMetadata<'interactionCreate'>) {
		const [interaction] = metadata.context;

		if (!interaction.isCommand()) {
			return;
		}

		const multipleFields = exceptionList.map((exception) => {
			return Object.values(exception.constraints || {}).map(
				(value): EmbedFieldData => ({
					name: exception.property,
					value,
				}),
			);
		});

		const embeds = multipleFields.map((fields) => {
			return this.messageService.createEmbed({
				title: `Validation Errors!`,
				fields,
				type: 'error',
			});
		});

		await this.messageService.sendRaw(interaction, { embeds, ephemeral: true });
	}
}
