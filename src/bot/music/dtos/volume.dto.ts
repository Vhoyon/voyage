import { Expose, Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { ArgNum } from 'discord-nestjs';

export const MINIMUM = 1;
export const MAXIMUM = 10;

export class VolumeDto {
	@ArgNum((_last: number) => ({ position: 1 }))
	@Expose()
	@Type(() => Number)
	@IsNumber()
	@Min(MINIMUM)
	@Max(MAXIMUM)
	volume!: number;
}
