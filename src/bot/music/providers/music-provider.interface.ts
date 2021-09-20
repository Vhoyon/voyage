import { PromiseLike } from '$/utils/types';
import { Message } from 'discord.js';
import { LinkableSong } from '../music.service';

export interface MusicProvider {
	getLinkableSong(query: string, message: Message): PromiseLike<LinkableSong | null>;
}
