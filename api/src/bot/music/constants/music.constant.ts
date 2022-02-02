import { InteractionButtonOptions } from 'discord.js';

export type PartialInteractionButtonOptions = Partial<InteractionButtonOptions> & Pick<InteractionButtonOptions, 'customId'>;

function createInteractionButtonMap<T extends { [name: string]: PartialInteractionButtonOptions }>(map: T) {
	return map;
}

export const MusicInteractionConstant = createInteractionButtonMap({
	REWIND: {
		customId: 'voyage_i_music_rewind',
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
	PLAY_FROM_HISTORY: {
		customId: 'voyage_i_music_play_from_history',
		emoji: '▶',
		label: `Last Played Song`,
	},
});
