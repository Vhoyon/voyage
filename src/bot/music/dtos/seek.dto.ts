import { Param } from '@discord-nestjs/core';
import { Matches } from 'class-validator';

export class SeekDto {
	// @ArgNum((_last: number) => ({ position: 1 }))
	// @Expose()
	// @Type(() => Number)
	// @IsNumber()
	// @Min(MINIMUM)
	// @Max(MAXIMUM)
	@Param({
		name: 'timestamp',
		description: `Timestamp in the format 'HH:MM:SS', 'MM:SS' or 'SS'. Single digits ('H:M:S') is also accepted.`,
		required: true,
	})
	@Matches(/^((\d\d:){1,2})?\d\d$/, {
		message: `Please follow the pattern given in the option description!`,
	})
	// @Transform(({ value }) => parseTimeIntoSeconds(value) * 1000)
	timestamp!: string;
}
