import { PromiseLike } from '$/utils/types';
import { Message } from 'discord.js';
import { LinkableSong } from './linkable-song.interface';

export interface MusicProvider {
	isQueryProviderUrl(query: string): boolean;

	getLinkableSong(query: string, isUrl: boolean, message: Message): PromiseLike<LinkableSong | null>;
}
