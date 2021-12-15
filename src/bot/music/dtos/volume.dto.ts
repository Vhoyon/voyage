import { Param, ParamType } from '@discord-nestjs/core';
import { Max, Min } from 'class-validator';

export const MINIMUM = 1;
export const MAXIMUM = 200;

export class VolumeDto {
	@Min(MINIMUM)
	@Max(MAXIMUM)
	@Param({ description: `Volume between ${MINIMUM} and ${MAXIMUM}`, required: true, type: ParamType.INTEGER })
	volume!: number;
}
