import { StreamDispatcher, TextChannel, VoiceChannel, VoiceConnection } from 'discord.js';
import { LinkableSong } from './linkable-song.interface';

export interface MusicBoard {
	id: string;
	textChannel: TextChannel;
	voiceChannel: VoiceChannel;
	songQueue: LinkableSong[];
	lastSongPlayed?: LinkableSong;
	volume: number;
	playing: boolean;
	connection: VoiceConnection;
	dispatcher?: StreamDispatcher;
	doDisconnectImmediately: boolean;
	disconnectTimeoutId?: NodeJS.Timeout;
	looping?: 'one' | 'all' | number;
}
