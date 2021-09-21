import { PromiseLike } from '$/utils/types';
import { Message } from 'discord.js';
import { LinkableSong } from '../music.service';

export interface MusicProvider {
	isQueryProviderUrl(query: string): PromiseLike<boolean>;

	getLinkableSong(query: string, isUrl: boolean, message: Message): PromiseLike<LinkableSong | null>;
}
