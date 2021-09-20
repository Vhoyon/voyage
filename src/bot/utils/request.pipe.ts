import { mixin } from '@nestjs/common';
import { DiscordPipeTransform } from 'discord-nestjs';
import { ClientEvents, Message } from 'discord.js';
import parseMessage from 'vcommand-parser';
import { VParserOptions } from 'vcommand-parser/dist/vcommandparser';

export const RequestPipe = createRequestPipe;

function createRequestPipe(parserOptions?: VParserOptions) {
	class RequestPipe implements DiscordPipeTransform {
		transform(_event: keyof ClientEvents, [context]: [Message], _content?: unknown, _type?: unknown) {
			return parseMessage(context.content, parserOptions);
		}
	}

	return mixin(RequestPipe);
}
