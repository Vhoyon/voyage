import assert from 'assert';
import { Promiseable } from './types';

export { setTimeout as sleep } from 'timers/promises';

export function pause<T>(cb: () => Promiseable<T>, ms?: number): Promise<T> {
	return new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				resolve(await cb());
			} catch (error) {
				reject(error);
			}
		}, ms);
	});
}

export function parseTimeIntoSeconds(time: string) {
	return +time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
}

export function parseMsIntoTime(milliseconds: number) {
	const time = new Date(milliseconds);

	const hours = time.getUTCHours();
	const minutes = time.getUTCMinutes();
	const seconds = time.getUTCSeconds();

	function pad(number: number) {
		const padSize = 2;

		return number.toString().padStart(padSize, '0');
	}

	const fHours = hours != 0 ? pad(hours) : undefined;
	const fMinutes = pad(minutes);
	const fSeconds = pad(seconds);

	return `${fHours ? `${fHours}:` : ''}${fMinutes}:${fSeconds}`;
}

export function probability(n: number) {
	const maxProb = 100;

	assert(n >= 0);
	assert(n <= maxProb);

	return Math.random() < n / maxProb;
}
