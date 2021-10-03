export function parseTimeIntoSeconds(time: string) {
	return +time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
}
