export function parseTimeIntoSeconds(time: string) {
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	return +time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
}
