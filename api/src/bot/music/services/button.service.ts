import { SendableOptions } from '$/bot/common/message.service';
import { PrismaService } from '$common/prisma/prisma.service';
import { hyperlink, inlineCode } from '@discordjs/builders';
import { Injectable } from '@nestjs/common';
import { RepeatMode, Song } from 'discord-music-player';
import { EmbedFieldData, MessageActionRow, MessageButton } from 'discord.js';
import { MusicInteractionConstant, PartialInteractionButtonOptions } from '../constants/music.constant';
import { DEFAULT_COUNT as DEFAULT_HISTORY_COUNT } from '../dtos/history.dto';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { PlayerButtonsOptions, VQueue } from '../player/player.types';

@Injectable()
export class ButtonService {
	constructor(private readonly prisma: PrismaService) {}

	createButton(options: PartialInteractionButtonOptions) {
		return new MessageButton({
			style: 'SECONDARY',
			...options,
		});
	}

	createRow(options: PartialInteractionButtonOptions[]) {
		return new MessageActionRow({
			components: options.map((buttonOptions) => {
				return this.createButton(buttonOptions);
			}),
		});
	}

	createPlayerButtons(options?: PlayerButtonsOptions) {
		const queueInteractions: PartialInteractionButtonOptions[] = [
			MusicInteractionConstant.REWIND,
			MusicInteractionConstant.PLAY_PAUSE,
			MusicInteractionConstant.SKIP,
		];

		if (options?.dynamicPlayerType) {
			queueInteractions.push(MusicInteractionConstant.STOP_DYNAMIC_PLAYER);
		}

		const queueRow = this.createRow(queueInteractions);

		const playerInteractions: PartialInteractionButtonOptions[] = [
			MusicInteractionConstant.REPEAT,
			MusicInteractionConstant.REPEAT_ALL,
			MusicInteractionConstant.DISCONNECT,
		];

		const playerRow = this.createRow(playerInteractions);

		return [queueRow, playerRow];
	}

	createNowPlayingWidget(queue: VQueue & { nowPlaying: Song }, options?: PlayerButtonsOptions): SendableOptions {
		const song = queue.nowPlaying;

		const progressBar = queue.createProgressBar().prettier;

		let repeatMode: string;

		switch (queue.repeatMode) {
			case RepeatMode.SONG:
				repeatMode = 'Looping Song';
				break;
			case RepeatMode.QUEUE:
				repeatMode = 'Looping Queue';
				break;
			case RepeatMode.DISABLED:
			default:
				repeatMode = 'Disabled';
				break;
		}

		const playerButtons = this.createPlayerButtons(options);

		const fields: EmbedFieldData[] = [
			{
				name: 'Requester',
				value: song.requestedBy!.tag,
				inline: true,
			},
			{
				name: 'Author',
				value: inlineCode(song.author),
				inline: true,
			},
			{
				name: 'Remaining songs',
				value: queue.songs.length.toString(),
				inline: true,
			},
			{
				name: 'Repeat Mode',
				value: repeatMode,
				inline: true,
			},
			{
				name: 'Volume',
				value: `${queue.volume}/${VOLUME_MAXIMUM}`,
				inline: true,
			},
		];

		const dynamicPlayerType = options?.dynamicPlayerType ?? queue.data.dynamicPlayer?.type;

		if (dynamicPlayerType) {
			fields.push({
				name: 'Dynamic Player Type',
				value: dynamicPlayerType,
				inline: true,
			});
		}

		fields.push({
			name: 'Progress',
			value: inlineCode(progressBar),
		});

		return {
			title: `Now playing : ${inlineCode(song.name)}!`,
			thumbnail: {
				url: song.thumbnail,
			},
			components: [...playerButtons],
			fields,
			url: song.url,
		};
	}

	createHistoryButtons() {
		const historyInteractions: PartialInteractionButtonOptions[] = [MusicInteractionConstant.PLAY_FROM_HISTORY];

		const historyRow = this.createRow(historyInteractions);

		return [historyRow];
	}

	/**
	 *
	 * @param data The context where to search the history for ; if given a string, it will be considered to be the guild's id and search through the database for the guild's play history.
	 * Otherwise, it'll simply format the songs array provided.
	 * @param options
	 * @returns
	 */
	async createHistoryWidget(
		data: string | Song[] | undefined,
		options?: Partial<{ displayAll: boolean; countToDisplay: number }>,
	): Promise<SendableOptions> {
		const { displayAll = false, countToDisplay = DEFAULT_HISTORY_COUNT } = options ?? {};

		const getSongDataHistory = async (): Promise<{ name: string; url: string }[] | SendableOptions> => {
			if (typeof data == 'string') {
				const MAX_FETCH_HISTORY = 50;

				const history = await this.prisma.musicLog.findMany({
					where: {
						guild: {
							guildId: data,
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
					take: displayAll ? Math.max(MAX_FETCH_HISTORY, countToDisplay) : Math.min(countToDisplay, MAX_FETCH_HISTORY),
				});

				if (!history.length) {
					return {
						title: `No history recorded yet, play a song!`,
					};
				}

				return history;
			} else {
				if (!data?.length) {
					return {
						title: `No history recorded yet, play a song!`,
					};
				}

				const history = displayAll ? data : data.slice(0, countToDisplay);

				return history;
			}
		};

		const history = await getSongDataHistory();

		if (!Array.isArray(history)) {
			// If not actual history, it is custom message
			return history;
		}

		const formattedHistory = history.map(({ name, url }, index) => {
			return `${inlineCode(`${index + 1}`)} : ${hyperlink(name, url)}`;
		});

		const historyString = formattedHistory.join(`\n`);

		const historyButtons = this.createHistoryButtons();

		const titleSubject = `Showing history for the last`;
		const titleData = history.length > 1 ? ` ${Math.min(history.length)} songs` : ` played song`;
		// If fetched from db, say it
		const titleEnding = typeof data == 'string' ? ` logged` : '';

		return {
			title: `${titleSubject}${titleData}${titleEnding}!`,
			components: [...historyButtons],
			description: historyString,
		};
	}
}
