import { PromiseLike } from '$/utils/types';
import { Message } from 'discord.js';
import { Readable } from 'stream';
import { LinkableSong } from './linkable-song.interface';

export interface MusicProvider {
	isQueryProviderUrl(query: string): boolean;

	getLinkableSong(query: string, isUrl: boolean, message: Message): PromiseLike<LinkableSong | null>;

	getStream(url: string): PromiseLike<Readable>;

	seek(song: LinkableSong, seconds: number): PromiseLike<LinkableSong>;
}
