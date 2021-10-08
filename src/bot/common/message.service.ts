import { bold } from '@discordjs/builders';
import { Injectable } from '@nestjs/common';
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
import { InformError } from './error/inform-error';

export type ChannelContext = Message | TextBasedChannels | Interaction;

export type GuildChannelsContext = Exclude<ChannelContext, PartialDMChannel | DMChannel>;

export type EmbedType = 'regular' | 'info' | 'error' | 'internal_error';

export type CustomEmbedOptions = {
	type?: EmbedType;
} & MessageEmbedOptions;

export type SendableOptions = CustomEmbedOptions & (MessageOptions | InteractionReplyOptions);

@Injectable()
export class MessageService {
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

	async sendError(context: ChannelContext, error: string | InformError, options?: SendableOptions) {
		const [data, type] = typeof error == 'string' ? [error, 'error' as EmbedType] : [error.message, error.type];

		const embed = this.createEmbed(data, {
			type,
			...options,
		});

		return this.sendEmbed(context, embed, { ephemeral: true, ...options });
	}

	async edit(message: Message, data: string | SendableOptions) {
		const [type, options] = typeof data != 'string' ? [data.type, data] : [];

		const newEmbed = this.createEmbed(data, { type });

		return message.edit({ embeds: [newEmbed], options });
	}

	async replace(context: ChannelContext, messageToReplace: Message, data: SendableOptions): Promise<Message>;
	async replace(context: ChannelContext, messageToReplace: Message, message: string, type?: EmbedType): Promise<Message>;

	async replace(context: ChannelContext, messageToReplace: Message, data: string | SendableOptions, type?: EmbedType) {
		const [finalType, options] = typeof data != 'string' ? [data.type, data] : [type];

		const newEmbed = this.createEmbed(data, { type: finalType });

		messageToReplace.delete();

		return this.sendEmbed(context, newEmbed, options);
	}

	protected async sendEmbed(context: ChannelContext, embed: MessageEmbed, payload?: MessageOptions | InteractionReplyOptions) {
		if (context instanceof Interaction) {
			const interactionEmbed = embed.addField('Action requested by', context.user.tag, true);

			if (context.isButton()) {
				await context.reply({
					embeds: [interactionEmbed],
					...payload,
				});

				return undefined;
			} else {
				return context.channel?.send({
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
	}
}
