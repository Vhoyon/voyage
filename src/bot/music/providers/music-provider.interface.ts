import { Message } from 'discord.js';
import { LinkableSong } from '../music.service';

export interface MusicProvider {
	getLinkableSong(query: string, message: Message): LinkableSong | Promise<LinkableSong>;
}
