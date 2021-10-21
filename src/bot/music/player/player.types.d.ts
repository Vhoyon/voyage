import { GuildChannelsContext } from '$/bot/common/message.service';
import { CallbackResult } from '$common/utils/types';
import { Playlist, Queue, Song } from 'discord-music-player';
import { Guild, GuildChannelResolvable, Message, TextChannel, User } from 'discord.js';

export type QueueData = {
	textChannel?: TextChannel;
	isPaused?: boolean;
	lastPlayedSong?: Song;
	dynamicPlayer?: DynamicPlayerData;
};

export type SongData = {
	query: string;
	skipped?: boolean;
};

export type MusicContext = Guild | GuildChannelsContext | Queue;

export type PlayerButtonsOptions = {
	dynamicPlayerType?: DynamicPlayerType;
};

export type PlaySongCallbacks<T> = {
	onSongSearch?: () => CallbackResult<T>;
	onSongSearchError?: (searchContext: T) => CallbackResult<T>;
	onSongPlay?: (searchContext: T, song: Song) => CallbackResult<T>;
	onSongAdd?: (searchContext: T, song: Song) => CallbackResult<T>;
};

export type PlayPlaylistCallbacks<T> = {
	onPlaylistSearch?: () => CallbackResult<T>;
	onPlaylistSearchError?: (searchContext: T) => CallbackResult<T>;
	onPlaylistPlay?: (searchContext: T, playlist: Playlist) => CallbackResult<T>;
	onPlaylistAdd?: (searchContext: T, playlist: Playlist) => CallbackResult<T>;
};

export type PlayMusicCallbacks<SongType, PlaylistType> = PlaySongCallbacks<SongType> & PlayPlaylistCallbacks<PlaylistType>;

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
	queue: Queue;
	voiceChannel: GuildChannelResolvable;
	volume: number;
	requester: User;
	options?: Options;
};

export type DynamicPlayerData = {
	type: DynamicPlayerType;
	interval: NodeJS.Timer;
	playerMessage?: Message;
};

export type DynamicPlayerOptions = {
	type?: DynamicPlayerType;
	delay?: number;
};
