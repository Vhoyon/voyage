import { Param, ParamType } from '@discord-nestjs/core';
import { IsOptional, Max, Min } from 'class-validator';

export const MINIMUM = 1;
export const MAXIMUM = 30;

export const DEFAULT_COUNT = 10;

export class HistoryDto {
	@IsOptional()
	@Min(MINIMUM)
	@Max(MAXIMUM)
	@Param({ description: 'Number of songs to show', required: false, type: ParamType.INTEGER })
	count = DEFAULT_COUNT;

	@IsOptional()
	@Param({ name: 'user', description: 'Only fetch songs from this user', required: false, type: ParamType.USER })
	userId?: string;
}
