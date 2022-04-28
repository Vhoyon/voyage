import { TransformedRealCommandExecutionContext } from '$/bot/@types/discord-nestjs';
import { InteractionFromServer } from '$/bot/common/guards/interaction-from-server.guard';
import { VoicePermissionChecker } from '$/bot/common/guards/permission.guard';
import { MessageService } from '$/bot/common/message.service';
import { parseMsIntoTime } from '$common/utils/funcs';
import { TransformPipe, ValidationPipe } from '@discord-nestjs/common';
import { Command, DiscordTransformedCommand, Payload, UseGuards, UsePipes } from '@discord-nestjs/core';
import { bold, inlineCode } from '@discordjs/builders';
import { Logger } from '@nestjs/common';
import { Playlist, Song } from 'discord-music-player';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { PlayDto } from '../../dtos/play.dto';
import { MAXIMUM as VOLUME_MAXIMUM } from '../../dtos/volume.dto';
import { MusicGuard } from '../../guards/music.guard';
import { DynamicPlayerType, PlayerService } from '../../player/player.service';

const VoicePermGuard = VoicePermissionChecker(['CONNECT', 'SPEAK'], `I need the permissions to join and speak in your voice channel!`);

@Command({
	name: 'play',
	description: 'Search for a song / playlist to play in the voice channel that you are in',
})
@UseGuards(InteractionFromServer, VoicePermGuard, MusicGuard)
@UsePipes(TransformPipe, ValidationPipe)
export class PlayCommand implements DiscordTransformedCommand<PlayDto> {
	private readonly logger = new Logger(PlayCommand.name);

	constructor(private readonly messageService: MessageService, private readonly player: PlayerService) {}

	async handler(@Payload() { query, dynamicType }: PlayDto, { interaction }: TransformedRealCommandExecutionContext) {
		const member = interaction.member as GuildMember;
		const voiceChannel = member.voice.channel!;
		const textChannel = interaction.channel instanceof TextChannel ? interaction.channel : undefined;

		await this.player.play({
			query,
			voiceChannel,
			requester: member.user,
			textChannel,
			onSongSearch: () => this.onSearch(interaction, query),
			onPlaylistSearch: () => this.onSearch(interaction, query),
			onSongSearchError: () => this.onSongSearchError(interaction, query),
			onPlaylistSearchError: () => this.onPlaylistSearchError(interaction, query),
			onSongPlay: () => this.onSongPlay(interaction, dynamicType),
			onSongAdd: (song) => this.onSongAdd(song, interaction),
			onPlaylistPlay: () => this.onPlaylistPlay(interaction, dynamicType),
			onPlaylistAdd: (playlist) => this.onPlaylistAdd(playlist, interaction),
		});
	}

	protected onSearch(interaction: CommandInteraction, query: string) {
		return this.messageService.send(interaction, bold(`Searching for ${inlineCode(query)}...`));
	}

	protected onSongSearchError(interaction: CommandInteraction, query: string) {
		return this.messageService.replace(
			interaction,
			`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the video is not private!`,
			{
				type: 'error',
			},
		);
	}

	protected onPlaylistSearchError(interaction: CommandInteraction, query: string) {
		return this.messageService.replace(
			interaction,
			`Couldn't find a match for the query ${inlineCode(query)}. If you used a link, make sure the playlist is not private!`,
			{
				type: 'error',
			},
		);
	}

	protected async onSongPlay(interaction: CommandInteraction, dynamicType?: DynamicPlayerType) {
		const nowPlayingWidget = this.player.createNowPlayingWidget(interaction, {
			dynamicPlayerType: dynamicType,
		});

		const playerMessage = await this.messageService.replace(interaction, nowPlayingWidget);

		if (playerMessage) {
			await this.player.setPlayerMessage(playerMessage, { type: dynamicType });
		}
	}

	protected onSongAdd(song: Song, interaction: CommandInteraction) {
		// const playerButtons = this.player.createPlayerButtons();

		return this.messageService.replace(interaction, {
			timeout: true,
			title: `Added song ${inlineCode(song.name)} to the queue!`,
			thumbnail: {
				url: song.thumbnail,
			},
			fields: [
				{
					name: 'Author',
					value: inlineCode(song.author),
					inline: true,
				},
				{
					name: 'Duration',
					value: inlineCode(song.duration),
					inline: true,
				},
				{
					name: 'Volume',
					value: `${song.queue.volume}/${VOLUME_MAXIMUM}`,
					inline: true,
				},
			],
			url: song.url,
			// components: [...playerButtons],
		});
	}

	protected async onPlaylistPlay(interaction: CommandInteraction, dynamicType?: DynamicPlayerType) {
		const nowPlayingWidget = this.player.createNowPlayingWidget(interaction, {
			dynamicPlayerType: dynamicType,
		});

		const playerMessage = await this.messageService.replace(interaction, nowPlayingWidget);

		if (playerMessage) {
			await this.player.setPlayerMessage(playerMessage, { type: dynamicType });
		}
	}

	protected onPlaylistAdd(playlist: Playlist, interaction: CommandInteraction) {
		// const playerButtons = this.player.createPlayerButtons();

		const totalDuration = playlist.songs.reduce((acc, song) => acc + song.milliseconds, 0);
		const formattedTotalDuration = parseMsIntoTime(totalDuration);

		return this.messageService.replace(interaction, {
			timeout: true,
			title: `Added playlist ${inlineCode(playlist.name)}!`,
			fields: [
				{
					name: 'Songs Count',
					value: inlineCode(playlist.songs.length.toString()),
					inline: true,
				},
				{
					name: 'Total Duration',
					value: inlineCode(formattedTotalDuration),
					inline: true,
				},
				{
					name: 'Volume',
					value: `${playlist.queue.volume}/${VOLUME_MAXIMUM}`,
					inline: true,
				},
			],
			url: playlist.url,
			// components: [...playerButtons],
		});
	}
}
