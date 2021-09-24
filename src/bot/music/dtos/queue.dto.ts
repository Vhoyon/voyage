import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ArgNum } from 'discord-nestjs';

export const MINIMUM = 1;
export const MAXIMUM = 30;

export class QueueDto {
	@ArgNum((_last: number) => ({ position: 1 }))
	@Expose()
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(MINIMUM)
	@Max(MAXIMUM)
	count!: number;
}
