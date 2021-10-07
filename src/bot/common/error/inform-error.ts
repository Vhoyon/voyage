import { bold } from '@discordjs/builders';
import { EmbedType, SendableOptions } from '../message.service';

export interface InformErrorOptions {
	message: string | SendableOptions;
	stack?: string;
}

export class InformError implements InformErrorOptions {
	message!: string | SendableOptions;

	get type(): EmbedType {
		return 'error';
	}
	protected set type(type) {
		this.type = type;
	}

	constructor(message: string, options?: Omit<InformErrorOptions, 'message'>);
	constructor(options: InformErrorOptions);

	constructor(data: string | InformErrorOptions, options?: Omit<InformErrorOptions, 'message'>) {
		if (typeof data == 'string') {
			this.message = data;
			Object.assign(this, options);
		} else {
			Object.assign(this, data);
		}
	}
}

export class InformErrorInfo extends InformError {
	constructor(message: string, options?: Omit<InformErrorOptions, 'message'>) {
		super(bold(message), options);

		this.type = 'info';
	}
}

export class InformInternalError extends InformError {
	constructor(message: string, options?: Omit<InformErrorOptions, 'message'>) {
		super(bold(message), options);

		this.type = 'internal_error';
	}
}
