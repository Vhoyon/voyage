import { bold } from '@discordjs/builders';
import { Injectable } from '@nestjs/common';
import { DMChannel, Message, MessageEmbed, MessageEmbedOptions, MessageOptions, PartialDMChannel, TextBasedChannels } from 'discord.js';

export type ChannelContext = Message | TextBasedChannels;

export type GuildChannelsContext = Exclude<ChannelContext, PartialDMChannel | DMChannel>;

export type EmbedType = 'regular' | 'info' | 'error';

export type SendableOptions = {
	type?: EmbedType;
} & MessageOptions &
	MessageEmbedOptions;

@Injectable()
export class MessageService {
	createEmbed(data: MessageEmbedOptions, type?: EmbedType): MessageEmbed;
	createEmbed(data: string | MessageEmbedOptions, embedOptions?: MessageEmbedOptions, type?: EmbedType): MessageEmbed;

	createEmbed(data: string | MessageEmbedOptions, optionsOrType?: MessageEmbedOptions | EmbedType, type?: EmbedType) {
		let defaultOptions: MessageEmbedOptions;

		const parsedType: EmbedType = (typeof optionsOrType == 'string' ? optionsOrType : type) ?? 'regular';

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
			case 'regular':
			default:
				defaultOptions = {
					color: 'DARK_AQUA',
				};
				break;
		}

		const options: MessageEmbedOptions = (() => {
			if (typeof data == 'string') {
				const additionalOptions = optionsOrType as MessageEmbedOptions | undefined;

				return {
					description: bold(data),
					...additionalOptions,
				};
			}

			return data;
		})();

		return new MessageEmbed({ ...defaultOptions, ...options });
	}

	async send(context: ChannelContext, data: SendableOptions): Promise<Message>;
	async send(context: ChannelContext, message: string, options?: SendableOptions): Promise<Message>;

	async send(context: ChannelContext, data: string | SendableOptions, options?: SendableOptions) {
		const [embedData, possibleOptions] = typeof data == 'string' ? [data, options] : [data];

		const embed = this.createEmbed(embedData, possibleOptions);

		return this.sendEmbed(context, embed, options);
	}

	async sendInfo(context: ChannelContext, message: string, options?: SendableOptions) {
		const embed = this.createEmbed(message, options, 'info');

		return this.sendEmbed(context, embed, options);
	}

	async sendError(context: ChannelContext, error: string, options?: SendableOptions) {
		const embed = this.createEmbed(error, options, 'error');

		return this.sendEmbed(context, embed, options);
	}

	async editEmbed(message: Message, data: string | SendableOptions) {
		const [type, options] = typeof data != 'string' ? [data.type, data] : [];

		const newEmbed = this.createEmbed(data, undefined, type);

		return message.edit({ embeds: [newEmbed], options });
	}

	async replaceEmbed(message: Message, messageToReplace: Message, data: string | MessageEmbedOptions, type?: EmbedType) {
		const newEmbed = this.createEmbed(data, undefined, type ?? 'regular');

		messageToReplace.delete();

		return this.sendEmbed(message, newEmbed);
	}

	protected sendEmbed(context: ChannelContext, embed: MessageEmbed, payload?: MessageOptions) {
		if (context instanceof Message) {
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
