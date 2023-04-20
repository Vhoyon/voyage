import { Param, ParamType } from '@discord-nestjs/core';
import { IsOptional, Max, Min } from 'class-validator';

export const MINIMUM = 1;
export const MAXIMUM = 30;

export const DEFAULT_COUNT = 10;

export class QueueDto {
	@IsOptional()
	@Min(MINIMUM)
	@Max(MAXIMUM)
	@Param({ description: 'Number of songs to show', required: false, type: ParamType.INTEGER })
	count = DEFAULT_COUNT;
}
