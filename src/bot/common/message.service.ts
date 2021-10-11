import { EnvironmentConfig } from '$common/configs/env.validation';
import { bold } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import { APIMessage } from 'discord-api-types';
import {
	DMChannel,
	Interaction,
	InteractionReplyOptions,
	Message,
	MessageEmbed,
	MessageEmbedOptions,
	MessageOptions,
	PartialDMChannel,
	TextBasedChannels,
} from 'discord.js';
import { InformError, InformInternalError } from './error/inform-error';

export type CommandContext = Message | TextBasedChannels;
export type InteractionContext = Interaction;

export type ChannelContext = CommandContext | InteractionContext;

export type GuildChannelsContext = Exclude<ChannelContext, PartialDMChannel | DMChannel>;

export type EmbedType = 'regular' | 'info' | 'error' | 'internal_error';

export type CustomEmbedOptions = {
	type?: EmbedType;
} & MessageEmbedOptions;

export type SendableOptions = CustomEmbedOptions & (MessageOptions | InteractionReplyOptions);

@Injectable()
export class MessageService {
	private readonly logger = new Logger(MessageService.name);

	constructor(private readonly env: EnvironmentConfig) {}

	createEmbed(data: CustomEmbedOptions): MessageEmbed;
	createEmbed(data: string, options?: CustomEmbedOptions): MessageEmbed;
	/**
	 * This method is mostly used internally to allow for multiple scenarios.
	 * If the `data` parameter is a {@link CustomEmbedOptions}, it will override the data in the `options` parameter.
	 *
	 * @param data
	 * @param options
	 */
	createEmbed(data: string | CustomEmbedOptions, options?: CustomEmbedOptions): MessageEmbed;

	createEmbed(data: string | CustomEmbedOptions, options?: CustomEmbedOptions) {
		let defaultOptions: MessageEmbedOptions;

		const parsedType: EmbedType = (typeof data == 'string' ? options?.type : data.type) ?? 'regular';

		switch (parsedType) {
			case 'info':
				defaultOptions = {
					title: 'Info',
					color: 'DARK_GOLD',
				};
				break;
			case 'error':
				defaultOptions = {
					title: 'Error!',
					color: 'RED',
				};
				break;
			case 'internal_error':
				defaultOptions = {
					title: 'Internal Error!',
					color: 'DARK_RED',
				};
				break;
			case 'regular':
			default:
				defaultOptions = {
					color: 'DARK_AQUA',
				};
				break;
		}

		const finalOptions: CustomEmbedOptions = (() => {
			if (typeof data == 'string') {
				return {
					description: bold(data),
					...options,
				};
			}

			return { ...options, ...data };
		})();

		return new MessageEmbed({ ...defaultOptions, ...finalOptions });
	}

	async send(context: ChannelContext, data: SendableOptions): Promise<Message>;
	async send(context: ChannelContext, message: string, options?: SendableOptions): Promise<Message>;
	async send(context: ChannelContext, data: string | SendableOptions, options?: SendableOptions): Promise<Message>;

	async send(context: ChannelContext, data: string | SendableOptions, options?: SendableOptions) {
		const embed = this.createEmbed(data, options);

		const finalOptions = typeof data == 'string' ? options : { ...options, ...data };

		return this.sendEmbed(context, embed, finalOptions);
	}

	async sendInfo(context: ChannelContext, message: string, options?: SendableOptions) {
		const embed = this.createEmbed(message, {
			type: 'info',
			...options,
		});

		return this.sendEmbed(context, embed, options);
	}

	async sendInternalError(context: ChannelContext, error: string, options?: SendableOptions) {
		const embed = this.createEmbed(error, {
			type: 'internal_error',
			...options,
		});

		return this.sendEmbed(context, embed, options);
	}

	async sendError(context: CommandContext, error: string | InformError, options?: SendableOptions): Promise<Message>;
	async sendError(context: CommandContext, error: unknown, options?: SendableOptions): Promise<Message | undefined>;
	async sendError(
		context: InteractionContext,
		error: string | InformError,
		options?: SendableOptions,
	): Promise<Message | APIMessage | undefined>;
	async sendError(context: InteractionContext, error: unknown, options?: SendableOptions): Promise<Message | APIMessage | undefined>;

	async sendError(context: ChannelContext, error: string | InformError | unknown, options?: SendableOptions) {
		if (!(typeof error == 'string' || error instanceof InformError)) {
			return;
		}

		const [data, type] = typeof error == 'string' ? [error, 'error' as EmbedType] : [error.message, error.type];

		const embed = this.createEmbed(data, {
			type,
			...options,
		});

		return this.sendEmbed(context, embed, { ephemeral: true, ...options });
	}

	async edit(message: Message, data: SendableOptions): Promise<Message>;
	async edit(message: Message, text: string, type?: EmbedType): Promise<Message>;

	async edit(message: Message, data: string | SendableOptions, type?: EmbedType) {
		const [finalType, options] = typeof data != 'string' ? [data.type, data] : [type];

		const newEmbed = this.createEmbed(data, { type: finalType });

		return message.edit({ embeds: [newEmbed], options });
	}

	async replace(context: CommandContext, messageToReplace: Message, data: SendableOptions): Promise<Message>;
	async replace(context: CommandContext, messageToReplace: Message, message: string, type?: EmbedType): Promise<Message>;
	async replace(context: InteractionContext, messageToReplace: Message, data: SendableOptions): Promise<Message | APIMessage | undefined>;
	async replace(
		context: InteractionContext,
		messageToReplace: Message,
		message: string,
		type?: EmbedType,
	): Promise<Message | APIMessage | undefined>;

	async replace(context: ChannelContext, messageToReplace: Message, data: string | SendableOptions, type?: EmbedType) {
		const [finalType, options] = typeof data != 'string' ? [data.type, data] : [type];

		const newEmbed = this.createEmbed(data, { type: finalType });

		messageToReplace.delete();

		return this.sendEmbed(context, newEmbed, options);
	}

	protected async sendEmbed(context: ChannelContext, embed: MessageEmbed, payload?: MessageOptions | InteractionReplyOptions) {
		try {
			if (context instanceof Interaction) {
				const isEphemeral = payload && 'ephemeral' in payload && payload.ephemeral;

				const interactionEmbed = isEphemeral ? embed : embed.addField('Action requested by', context.user.tag, true);

				if (context.isButton()) {
					await context.reply({
						embeds: [interactionEmbed],
						...payload,
					});

					if (!isEphemeral) {
						const message = await context.fetchReply();

						if (message instanceof Message) {
							const timeout = this.env.DISCORD_INTERACTION_MESSAGE_TIMEOUT;

							if (timeout > 0) {
								setTimeout(() => message.delete().catch(), timeout * 1000);
							}
						}

						return message;
					}
				} else {
					if (!context.channel) {
						this.logger.error('Interaction has no channel when trying to send reply to it.', undefined, context);
						throw new InformInternalError('The interaction has no channel to send a message to!');
					}

					return context.channel.send({
						embeds: [interactionEmbed],
						...payload,
					});
				}
			} else if (context instanceof Message) {
				return context.reply({
					embeds: [embed],
					allowedMentions: {
						repliedUser: false,
					},
					...payload,
				});
			} else {
				return context.send({
					embeds: [embed],
					...payload,
				});
			}
		} catch (error) {
			this.logger.error(`Error sending embed : `, error);

			throw error;
		}
	}
}
