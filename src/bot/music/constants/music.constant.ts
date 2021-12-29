import { InteractionButtonOptions } from 'discord.js';

export type PartialInteractionButtonOptions = Partial<InteractionButtonOptions> & Pick<InteractionButtonOptions, 'customId'>;

export type InteractionButtonNames = 'LAST_SONG' | 'PLAY_PAUSE' | 'SKIP' | 'REPEAT' | 'REPEAT_ALL' | 'DISCONNECT' | 'STOP_DYNAMIC_PLAYER';

export const MusicInteractionConstant: Record<InteractionButtonNames, PartialInteractionButtonOptions> = {
	LAST_SONG: {
		customId: 'voyage_i_music_last_song',
		emoji: '⏮',
	},
	PLAY_PAUSE: {
		customId: 'voyage_i_music_play_pause',
		emoji: '⏯',
	},
	SKIP: {
		customId: 'voyage_i_music_skip',
		emoji: '⏩',
	},
	REPEAT: {
		customId: 'voyage_i_music_repeat',
		emoji: '🔂',
	},
	REPEAT_ALL: {
		customId: 'voyage_i_music_repeat_all',
		emoji: '🔁',
	},
	DISCONNECT: {
		customId: 'voyage_i_music_disconnect',
		emoji: '⏹',
	},
	STOP_DYNAMIC_PLAYER: {
		customId: 'voyage_i_music_stop_dynamic_player',
		emoji: '🛑',
	},
};
