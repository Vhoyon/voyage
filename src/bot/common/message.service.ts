import { bold } from '@discordjs/builders';
import { Injectable } from '@nestjs/common';
import { Message, MessageEmbed, MessageEmbedOptions, TextBasedChannels } from 'discord.js';

export type ChannelContext = TextBasedChannels | Message;

export type EmbedType = 'regular' | 'info' | 'error';

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

	async send(context: ChannelContext, embedOptions: MessageEmbedOptions): Promise<Message>;
	async send(context: ChannelContext, message: string, embedOptions?: MessageEmbedOptions): Promise<Message>;

	async send(context: ChannelContext, data: string | MessageEmbedOptions, embedOptions?: MessageEmbedOptions) {
		const embed = this.createEmbed(data, embedOptions);

		return this.sendEmbed(context, embed);
	}

	async sendInfo(context: ChannelContext, message: string, embedOptions?: MessageEmbedOptions) {
		const embed = this.createEmbed(message, embedOptions, 'info');

		return this.sendEmbed(context, embed);
	}

	async sendError(context: ChannelContext, error: string, embedOptions?: MessageEmbedOptions) {
		const embed = this.createEmbed(error, embedOptions, 'error');

		return this.sendEmbed(context, embed);
	}

	async editEmbed(message: Message, data: string | MessageEmbedOptions, type: EmbedType = 'regular') {
		const newEmbed = this.createEmbed(data, undefined, type);

		return message.edit({ embeds: [newEmbed] });
	}

	async replaceEmbed(message: Message, messageToReplace: Message, data: string | MessageEmbedOptions, type: EmbedType = 'regular') {
		const newEmbed = this.createEmbed(data, undefined, type);

		messageToReplace.delete();

		return this.sendEmbed(message, newEmbed);
	}

	protected sendEmbed(context: ChannelContext, embed: MessageEmbed) {
		if (context instanceof Message) {
			return context.reply({
				embeds: [embed],
				allowedMentions: {
					repliedUser: false,
				},
			});
		} else {
			return context.send({ embeds: [embed] });
		}
	}
}
