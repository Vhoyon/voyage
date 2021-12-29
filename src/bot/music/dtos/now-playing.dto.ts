import { Choice, Param } from '@discord-nestjs/core';
import { DynamicPlayerType } from '../player/player.service';

export class NowPlayingDto {
	@Choice(DynamicPlayerType)
	@Param({ name: 'dynamic-type', description: 'Type of dynamic player', required: false })
	dynamicType?: DynamicPlayerType;
}
