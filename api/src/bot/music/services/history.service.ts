import { SendableOptions } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Song } from 'discord-music-player';
import { EmbedFieldData, User } from 'discord.js';

export type Condition = {
	name: string;
	value: string;
};

export type HistoryWidgetOptions = {
	displayAll: boolean;
	countToDisplay: number;
	user?: User;
};

export type HistoryLog = {
	name: string;
	url: string;
	requester: User | null;
};

@Injectable()
export class HistoryService {
	constructor(private readonly prisma: PrismaService) {}

	createConditionFields(conditions: Condition[]) {
		if (!conditions?.length) {
			return;
		}

		return conditions.map(
			(condition): EmbedFieldData => ({
				name: condition.name,
				value: condition.value,
				inline: true,
			}),
		);
	}

	async getHistory(
		data: string | Song[] | undefined,
		options: HistoryWidgetOptions,
	): Promise<SendableOptions | { history: HistoryLog[]; conditions: Condition[] }> {
		if (!data) {
			return {
				title: `No history recorded yet, play a song!`,
			};
		}

		const conditions: Condition[] = [];

		if (options.user) {
			conditions.push({ name: `User`, value: options.user.tag });
		}

		const history =
			typeof data == 'string' ? await this.getHistoryFromDB(data, options) : this.getHistoryFromCache(data, conditions, options);

		if (!history.length) {
			return {
				title: conditions.length
					? `No history of songs with given conditions, try narrowing your search criterias!`
					: `No history recorded yet, play a song!`,
				fields: this.createConditionFields(conditions),
			};
		}

		return {
			history,
			conditions,
		};
	}

	async getHistoryFromDB(guildId: string, options: HistoryWidgetOptions): Promise<HistoryLog[]> {
		const MAX_FETCH_HISTORY = 50;

		const logHistory = await this.prisma.musicLog.findMany({
			where: {
				guild: {
					guildId,
				},
				requester: options.user?.id,
				NOT: {
					requester: null,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: options.displayAll ? Math.max(MAX_FETCH_HISTORY, options.countToDisplay) : Math.min(options.countToDisplay, MAX_FETCH_HISTORY),
		});

		return logHistory.map((log) => ({
			...log,
			requester: options.user ?? null,
		}));
	}

	getHistoryFromCache(songs: Song[], conditions: Condition[], options: HistoryWidgetOptions): HistoryLog[] {
		let filteredSongs = songs.filter((song) => song.requestedBy) as (Song & { requestedBy: User })[];

		if (options.user) {
			const user = options.user;

			filteredSongs = filteredSongs.filter((song) => song.requestedBy.id === user.id);
		}

		if (!filteredSongs.length) {
			return [];
		}

		const songHistory = options.displayAll ? filteredSongs : filteredSongs.slice(0, options.countToDisplay);

		return songHistory.map((song) => ({
			...song,
			requester: options.user ?? null,
		}));
	}
}
