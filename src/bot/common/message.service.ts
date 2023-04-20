import { EnvironmentConfig } from '$common/configs/env.validation';
import { sleep } from '$common/utils/funcs';
import { InjectDiscordClient } from '@discord-nestjs/core';
import { bold } from '@discordjs/builders';
import { Injectable, Logger } from '@nestjs/common';
import {
	ButtonInteraction,
	Client,
	CommandInteraction,
	ContextMenuInteraction,
	DMChannel,
	Interaction,
	InteractionReplyOptions,
	Message,
	MessageComponentInteraction,
	MessageEmbed,
	MessageEmbedOptions,
	MessageOptions,
	PartialDMChannel,
	Snowflake,
	TextBasedChannel,
} from 'discord.js';
import { InformError, InformInternalError } from './error/inform-error';
import { LogWarning } from './error/log-warning';

export type CommandContext = Message | TextBasedChannel;
export type InteractionContext = ButtonInteraction | CommandInteraction | ContextMenuInteraction;

export type ChannelContext = CommandContext | InteractionContext;

export type GuildChannelsContext = Exclude<ChannelContext, PartialDMChannel | DMChannel>;

export type EmbedType = 'regular' | 'info' | 'error' | 'internal_error';

export type CustomEmbedOptions = {
	type?: EmbedType;
} & MessageEmbedOptions;

export type CustomSendOptions = {
	/**
	 * Activate default message deletion timeout or set custom timeout in seconds.
	 * 0 and negative values are ignored.
	 */
	timeout?: boolean | number;
};

export type SendableOptions = CustomSendOptions & CustomEmbedOptions & (MessageOptions | InteractionReplyOptions);

export type SavedHistoryMessage = { messageId: Snowflake; channelId: Snowflake };

export type DirtyMessage = SavedHistoryMessage | Awaited<ReturnType<MessageComponentInteraction['fetchReply']>>;

@Injectable()
export class MessageService {
	private readonly logger = new Logger(MessageService.name);

	constructor(
		private readonly env: EnvironmentConfig,
		@InjectDiscordClient()
		private readonly client: Client,
	) {}

	async get(message: DirtyMessage): Promise<Message> {
		if (message instanceof Message) {
			return message;
		}

		const { channelId, messageId } = ((): SavedHistoryMessage => {
			if ('channelId' in message && 'messageId' in message) {
				return {
					channelId: message.channelId,
					messageId: message.messageId,
				};
			}

			return {
				channelId: message.channel_id,
				messageId: message.id,
			};
		})();

		let channel = this.client.channels.cache.get(channelId);

		if (!channel) {
			try {
				const fetchedChannel = await this.client.channels.fetch(channelId);

				if (!fetchedChannel) {
					throw `Cannot get API Message as its channel (id: ${channelId}) was not found!`;
				}

				channel = fetchedChannel;
			} catch (error) {
				throw `An error happened while fetching the channel with id ${channelId}!`;
			}
		}

		if (!channel.isText()) {
			throw `Cannot get API Message that doesn't come from a TextBasedChannel!`;
		}

		const apiMessage = channel.messages.cache.get(messageId);

		if (!apiMessage) {
			try {
				const fetchMessage = await channel.messages.fetch(messageId);

				return fetchMessage;
			} catch (error) {
				throw `Cannot get API Message that doesn't exist!`;
			}
		}

		return apiMessage;
	}

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

		const parsedType: EmbedType = (typeof data == 'string' ? options?.type : data.type || options?.type) ?? 'regular';

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

		const finalOptions = ((): CustomEmbedOptions => {
			if (options?.title && !options.title.match(/^\*.*\*$/)) {
				options.title = bold(options.title);
			}

			if (typeof data == 'string') {
				if (data.length == 0) {
					return { ...options };
				}

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

	async sendError(context: ChannelContext, error: string | InformError, options?: SendableOptions) {
		const [data, type] = typeof error == 'string' ? [error, 'error' as EmbedType] : [error.message, error.type];

		const embed = this.createEmbed(data, {
			type,
			...options,
		});

		return this.sendEmbed(context, embed, { ephemeral: true, ...options });
	}

	async sendInternalError(context: ChannelContext, error: string | InformError, options?: Omit<SendableOptions, 'type'>) {
		return this.sendError(context, error, { type: 'internal_error', ...options });
	}

	async sendRaw(context: ChannelContext, payload?: SendableOptions): Promise<Message> {
		/** Can't delete ephemeral messages. */
		const isEphemeral = payload && 'ephemeral' in payload && payload.ephemeral;

		if (context instanceof Interaction) {
			if (context.isButton()) {
				try {
					await context.reply({ ...payload });
				} catch (error) {
					throw new LogWarning(`Error while replying to button interaction`, { error });
				}

				const dirtyMessage = await context.fetchReply();
				const message = await this.get(dirtyMessage);

				if (!isEphemeral) {
					this.delete(message, true).catch(() => {
						// Can't delete, pass on
					});
				}

				return message;
			} else if (context.isCommand()) {
				try {
					await context.reply({ ...payload });
				} catch (error) {
					throw new LogWarning(`Error while replying to command interaction`, { error });
				}

				const dirtyMessage = await context.fetchReply();
				const message = await this.get(dirtyMessage);

				if (!isEphemeral && payload?.timeout) {
					this.delete(message, payload.timeout).catch(() => {
						// Can't delete, pass on
					});
				}

				return message;
			}

			throw 'Support for given Interaction context is not implemented yet!';
		} else if (context instanceof Message) {
			let message;

			try {
				message = await context.reply({
					allowedMentions: {
						repliedUser: false,
					},
					...payload,
				});
			} catch (error) {
				throw new LogWarning(`Error while replying to message`, { error });
			}

			if (!isEphemeral && payload?.timeout) {
				this.delete(message, payload.timeout).catch(() => {
					// Can't delete, pass on
				});
			}

			return message;
		} else {
			let message;

			try {
				message = await context.send({ ...payload });
			} catch (error) {
				throw new LogWarning(`Error while sending message in channel`, { error });
			}

			if (!isEphemeral && payload?.timeout) {
				this.delete(message, payload.timeout).catch(() => {
					// Can't delete, pass on
				});
			}

			return message;
		}
	}

	async edit(message: Message, data: SendableOptions): Promise<Message>;
	async edit(message: Message, text: string, editOptions?: { type?: EmbedType }): Promise<Message>;

	async edit(interaction: InteractionContext, data: SendableOptions): Promise<Message>;
	async edit(interaction: InteractionContext, text: string, editOptions?: { type?: EmbedType }): Promise<Message>;

	async edit(context: Message | InteractionContext, data: string | SendableOptions, editOptions?: { type?: EmbedType }) {
		const [finalType, options] = typeof data != 'string' ? [data.type, data] : [editOptions?.type];

		const newEmbed = this.createEmbed(data, { type: finalType });

		if (context instanceof Message) {
			return context.edit({ embeds: [newEmbed], ...options });
		}

		const dirtyMessage = await context.editReply({ embeds: [newEmbed], ...options });

		return this.get(dirtyMessage);
	}

	async replace(message: Message, data: SendableOptions, options?: { context?: CommandContext }): Promise<Message>;
	async replace(message: Message, data: string, options?: { context?: CommandContext; type?: EmbedType }): Promise<Message>;

	async replace(message: Message, data: SendableOptions, options?: { context?: ChannelContext }): Promise<Message | undefined>;
	async replace(message: Message, data: string, options?: { context?: ChannelContext; type?: EmbedType }): Promise<Message | undefined>;

	async replace(interaction: InteractionContext, data: SendableOptions): Promise<Message | undefined>;
	async replace(interaction: InteractionContext, data: string, options?: { type?: EmbedType }): Promise<Message | undefined>;

	async replace(
		context: Message | InteractionContext,
		data: string | SendableOptions,
		replaceOptions?: {
			context?: ChannelContext;
			type?: EmbedType;
		},
	) {
		const [finalType, options] = typeof data != 'string' ? [data.type, data] : [replaceOptions?.type];

		const finalContext = replaceOptions?.context ?? context.channel;

		if (!finalContext) {
			throw new InformInternalError('Cannot replace a message without a channel to send it to, please fix my code!');
		}

		try {
			await this.delete(context);
		} catch (error) {
			throw new InformError(`Couldn't delete the message to replace!`, { error });
		}

		const newEmbed = this.createEmbed(data, { type: finalType });

		return this.sendEmbed(finalContext, newEmbed, options);
	}

	/**
	 * Deletes the given message, optionally after a timeout.
	 *
	 * @param context The message instance to delete.
	 * @param timeout Timeout in seconds. If given `true`, a default of `EnvironmentConfig.DISCORD_INTERACTION_MESSAGE_TIMEOUT` will be used.
	 * @returns
	 */
	async delete(context: Message | InteractionContext, timeout?: number | boolean) {
		if (timeout) {
			const finalTimeout = typeof timeout == 'number' ? timeout : this.env.DISCORD_INTERACTION_MESSAGE_TIMEOUT;

			if (finalTimeout < 0) {
				return;
			}

			if (finalTimeout > 0) {
				await sleep(finalTimeout * 1000);
			}
		}

		if (context instanceof Message) {
			return context.delete();
		} else {
			return context.deleteReply();
		}
	}

	protected async sendEmbed(context: ChannelContext, embed: MessageEmbed, payload?: SendableOptions) {
		let finalEmbed = embed;

		try {
			if (context instanceof Interaction && !context.isCommand()) {
				const isEphemeral = payload && 'ephemeral' in payload && payload.ephemeral;

				finalEmbed = isEphemeral ? embed : embed.addField('Action requested by', context.user.tag, true);
			}

			return this.sendRaw(context, { embeds: [finalEmbed], ...payload });
		} catch (error) {
			this.logger.error(`Error sending embed : `, error);

			throw error;
		}
	}
}
