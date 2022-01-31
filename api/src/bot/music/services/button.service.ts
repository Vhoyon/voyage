import { SendableOptions } from '$/bot/common/message.service';
import { inlineCode } from '@discordjs/builders';
import { Injectable } from '@nestjs/common';
import { RepeatMode, Song } from 'discord-music-player';
import { EmbedFieldData, MessageActionRow, MessageButton } from 'discord.js';
import { MusicInteractionConstant, PartialInteractionButtonOptions } from '../constants/music.constant';
import { MAXIMUM as VOLUME_MAXIMUM } from '../dtos/volume.dto';
import { PlayerButtonsOptions, VQueue } from '../player/player.types';

@Injectable()
export class ButtonService {
	createButton(options: PartialInteractionButtonOptions) {
		return new MessageButton({
			style: 'SECONDARY',
			...options,
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

		const queueRow = new MessageActionRow({
			components: queueInteractions.map((interaction) => {
				return this.createButton(interaction);
			}),
		});

		const playerInteractions: PartialInteractionButtonOptions[] = [
			MusicInteractionConstant.REPEAT,
			MusicInteractionConstant.REPEAT_ALL,
			MusicInteractionConstant.DISCONNECT,
		];

		const playerRow = new MessageActionRow({
			components: playerInteractions.map((interaction) => {
				return this.createButton(interaction);
			}),
		});

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
}
