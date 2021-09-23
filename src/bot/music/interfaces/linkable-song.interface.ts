import { PlaySongOptions } from '../services/music.service';
import { MusicProvider } from './music-provider.interface';

export interface LinkableSong {
	query: string;
	provider: MusicProvider;
	url: string;
	title: string;
	description?: string;
	/** Duration of the song in seconds */
	duration: number;
	options?: Partial<PlaySongOptions>;
}
