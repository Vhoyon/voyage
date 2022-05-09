import type { Logger } from '@nestjs/common';

export interface LogWarningOptions {
	error?: unknown;
	logger?: Logger;
}

export class LogWarning implements LogWarningOptions {
	message: string;
	error?: unknown;
	logger?: Logger;

	constructor(message: string, options?: LogWarningOptions) {
		this.message = message;

		Object.assign(this, options);
	}

	/**
	 *
	 * @param logger Default logger if none provided in the warning options.
	 */
	log(logger: Logger) {
		let message = this.message;

		if (this.error) {
			const error = this.error;

			message = `${message} : "${error}"`;
		}

		message = message.endsWith('.') ? message : `${message}.`;

		(this.logger ?? logger).warn(message);
	}
}
