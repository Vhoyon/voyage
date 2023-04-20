import { Choice, Param } from '@discord-nestjs/core';
import { DynamicPlayerType } from '../player/player.service';

export class PlayDto {
	@Param({ description: 'Link or search query', required: true })
	query!: string;

	@Choice(DynamicPlayerType)
	@Param({ name: 'dynamic-type', description: 'Type of dynamic player', required: false })
	dynamicType: DynamicPlayerType = DynamicPlayerType.UPDATEABLE;
}
