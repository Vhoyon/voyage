import { DirtyMessage, MessageService, SavedHistoryMessage, SendableOptions } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Song } from 'discord-music-player';
import { EmbedFieldData, Message, Snowflake, TextChannel, User } from 'discord.js';

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
	private readonly logger = new Logger(HistoryService.name);

	constructor(private readonly prisma: PrismaService, private readonly messageService: MessageService) {}

	protected historyMessages: Record<Snowflake, Message | undefined> = {};

	setHistoryMessage(channel: TextChannel, message: Message) {
		const previousHistoryMessage = this.historyMessages[channel.guild.id];

		this.historyMessages[channel.guild.id] = message;

		this.updatePreviousHistoryMessage(channel, message, previousHistoryMessage).catch((error) => {
			this.logger.warn(`An error happened while trying to update the previous history message : ${error}`);
		});
	}

	async updatePreviousHistoryMessage(channel: TextChannel, newMessage: Message, previousMessage?: Message) {
		let dirtyMessage: DirtyMessage;

		if (previousMessage) {
			dirtyMessage = previousMessage;
		} else {
			// const;
			const musicSetting = await this.prisma.musicSetting.findFirst({
				where: {
					guild: {
						guildId: channel.guild.id,
					},
				},
				select: {
					historyChannelId: true,
					historyMessageId: true,
				},
			});

			if (!musicSetting) {
				this.logger.error(`Found missing music settings for guild "${channel.guild.id}". This should never happen!`);
				return;
			}

			if (!musicSetting.historyChannelId || !musicSetting.historyMessageId) {
				return;
			}

			dirtyMessage = {
				channelId: musicSetting.historyChannelId,
				messageId: musicSetting.historyMessageId,
			} as SavedHistoryMessage;
		}

		const message = await this.messageService.get(dirtyMessage);

		await this.messageService.edit(message, { embeds: message.embeds, components: [] }).catch(() => {
			// do nothing if edit fails
		});

		await this.prisma.musicSetting.updateMany({
			data: {
				historyChannelId: channel.id,
				historyMessageId: newMessage.id,
			},
			where: {
				guild: {
					guildId: channel.guild.id,
				},
			},
		});
	}

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
