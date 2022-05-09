import { bold } from '@discordjs/builders';
import type { EmbedType, SendableOptions } from '../message.service';

export interface InformErrorOptions {
	stack?: string;
	error?: unknown;
}

export interface InformErrorData extends InformErrorOptions {
	message: string | SendableOptions;
}

export class InformError implements InformErrorData {
	message!: string | SendableOptions;
	type: EmbedType = 'error';
	stack?: string;
	error?: unknown;

	constructor(message: string, options?: InformErrorOptions);
	constructor(options: InformErrorData);

	constructor(data: string | InformErrorData, options?: InformErrorOptions) {
		if (typeof data == 'string') {
			this.message = data;

			if (options?.error instanceof Error) {
				if (!options.stack) {
					this.stack = options.error.stack;
				}
			}

			Object.assign(this, options);
		} else {
			Object.assign(this, data);
		}
	}
}

export class InformErrorInfo extends InformError {
	constructor(message: string, options?: InformErrorOptions) {
		super(bold(message), options);

		this.type = 'info';
	}
}

export class InformInternalError extends InformError {
	constructor(message: string, options?: InformErrorOptions) {
		super(bold(message), options);

		this.type = 'internal_error';
	}
}
