export function parseTimeIntoSeconds(time: string) {
	return +time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
}

export function parseMsIntoTime(milliseconds: number) {
	const time = new Date(milliseconds);

	const hours = time.getUTCHours();
	const minutes = time.getUTCMinutes();
	const seconds = time.getUTCSeconds();

	function pad(number: number) {
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		return number.toString().padStart(2, '0');
	}

	return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}
