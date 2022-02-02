import { GuildChannelsContext } from '$/bot/common/message.service';
import { CallbackResult, Promiseable } from '$common/utils/types';
import { Playlist, PlayOptions, Queue, Song } from 'discord-music-player';
import { Guild, GuildChannelResolvable, Message, StageChannel, TextChannel, User, VoiceChannel } from 'discord.js';
import { DynamicPlayerType } from './player.service';

export type QueueData = {
	/** TextChannel where the last command was sent in. */
	textChannel?: TextChannel;
	isPaused?: boolean;
	/** Array of recently played songs, lower index being more recent. */
	history?: Song[];
	dynamicPlayer?: DynamicPlayerData;
	playerMessage?: Message;
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export type VQueue = Omit<Queue, 'data'> & { data: QueueData };

export type MusicContext = Guild | GuildChannelsContext | Queue;

export type PlayerButtonsOptions = {
	dynamicPlayerType?: DynamicPlayerType;
};

export type PlaySongCallbacks<T> = {
	onSongSearch?: () => CallbackResult<T>;
	onSongSearchError?: (searchContext: T) => CallbackResult<unknown>;
	onSongPlay?: (song: Song, searchContext: T) => CallbackResult<unknown>;
	onSongAdd?: (song: Song, searchContext: T) => CallbackResult<unknown>;
};

export type PlayPlaylistCallbacks<T> = {
	onPlaylistSearch?: () => CallbackResult<T>;
	onPlaylistSearchError?: (searchContext: T) => CallbackResult<unknown>;
	onPlaylistPlay?: (playlist: Playlist, searchContext: T) => CallbackResult<unknown>;
	onPlaylistAdd?: (playlist: Playlist, searchContext: T) => CallbackResult<unknown>;
};

export type PlayMusicCallbacks<SongType, PlaylistType> = PlaySongCallbacks<SongType> & PlayPlaylistCallbacks<PlaylistType>;

export type DMPPlayOptions = PlayOptions & {
	immediate?: boolean;
	seek?: number;
	data?: SongData;
};

export type PlayMusicQuery = {
	query: string;
	voiceChannel: VoiceChannel | StageChannel;
	requester: User;
	playOptions?: DMPPlayOptions;
};

export type PlayMusicOptions<SongType, PlaylistType> = PlayMusicCallbacks<SongType, PlaylistType> & {
	/** This allows to setup the queue with the textChannel data property, therefore sending messages on different events. */
	textChannel?: TextChannel;
};

export type PlayMusicData<
	SongType,
	PlaylistType,
	Options extends PlayMusicOptions<SongType, PlaylistType> = PlayMusicOptions<SongType, PlaylistType>,
> = {
	query: string;
	queue: VQueue;
	voiceChannel: GuildChannelResolvable;
	volume: number;
	requester: User;
	options?: Options;
	playOptions?: DMPPlayOptions;
};

export type DynamicPlayerData = {
	type: DynamicPlayerType;
	interval: NodeJS.Timer;
	updater: () => Promiseable<void>;
};

export type DynamicPlayerOptions = {
	type?: DynamicPlayerType;
	delay?: number;
};
