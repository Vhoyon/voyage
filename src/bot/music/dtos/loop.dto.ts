import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ArgNum } from 'discord-nestjs';

export const MINIMUM = 1;

export class LoopDto {
	@ArgNum((_last: number) => ({ position: 1 }))
	@Expose()
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(MINIMUM)
	count?: number;
}
