import { Type } from '@nestjs/common';
import { Readable } from 'stream';
import { PlaySongOptions } from '../services/music.service';
import { MusicProvider } from './music-provider.interface';

export interface LinkableSong {
	query: string;
	provider: Type<MusicProvider>;
	url: string;
	title: string;
	description?: string;
	/** Duration of the song in seconds */
	duration: number;
	getStream: () => PromiseLike<Readable>;
	options?: Partial<PlaySongOptions>;
}
