import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export enum Environment {
	Development = 'development',
	Production = 'production',
	Test = 'test',
}

export const DEFAULT_PORT = 3000;

export const DEFAULT_GRAPHQL_DEPTH_LIMIT = 10;

export const DEFAULT_DISCORD_PREFIX = '!';

export const DEFAULT_DISCORD_MUSIC_DISCONNECT_TIMEOUT = 60;
export const DEFAULT_DISCORD_MUSIC_ALONE_DISCONNECT_TIMEOUT = 15;

export const DEFAULT_DISCORD_INTERACTION_MESSAGE_TIMEOUT = 10;

export const DEFAULT_DISCORD_PLAYER_UPDATE_INTERVAL = 10;

export function splitIntoArray(value: string) {
	return value
		.split(',')
		.filter((s) => !!s)
		.map((s) => s.trim());
}

export class EnvironmentConfig {
	@IsEnum(Environment)
	readonly NODE_ENV: Environment = Environment.Development;

	@Type(() => Number)
	@IsInt()
	readonly PORT: number = DEFAULT_PORT;

	@Type(() => Number)
	@IsInt()
	readonly GRAPHQL_DEPTH_LIMIT: number = DEFAULT_GRAPHQL_DEPTH_LIMIT;

	@IsString()
	readonly KEY!: string;

	// ---------------
	//     DISCORD
	// ---------------

	@IsString()
	readonly DISCORD_TOKEN!: string;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	readonly DISCORD_MUSIC_DISCONNECT_TIMEOUT: number = DEFAULT_DISCORD_MUSIC_DISCONNECT_TIMEOUT;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	readonly DISCORD_INTERACTION_MESSAGE_TIMEOUT: number = DEFAULT_DISCORD_INTERACTION_MESSAGE_TIMEOUT;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	readonly DISCORD_PLAYER_UPDATE_INTERVAL: number = DEFAULT_DISCORD_PLAYER_UPDATE_INTERVAL;

	// @IsString()
	// readonly YOUTUBE_API_KEY!: string;

	@IsOptional()
	@Matches(/(\d{18})+/, {
		message: `DISCORD_DEV_GUILDS must be a string of guild ids (18 numbers), separated by commas (spaces between are allowed)`,
		each: true,
	})
	@Transform(({ value }) => splitIntoArray(value))
	readonly DISCORD_DEV_GUILDS?: string[];

	// ---------------
	//     DATABASE
	// ---------------

	@IsOptional()
	@IsString()
	readonly DB_USER?: string;

	@IsOptional()
	@IsString()
	readonly DB_PSW?: string;

	@IsOptional()
	@IsString()
	readonly DB_CONN?: string;

	@IsOptional()
	@IsString()
	readonly DB_NAME?: string;

	@IsOptional()
	@IsString()
	readonly DB_TEST_USER?: string;

	@IsOptional()
	@IsString()
	readonly DB_TEST_PSW?: string;

	@IsOptional()
	@IsString()
	readonly DB_TEST_CONN?: string;

	@IsOptional()
	@IsString()
	readonly DB_TEST_NAME?: string;

	@IsString()
	readonly DATABASE_URL!: string;

	@IsOptional()
	@IsString()
	readonly TEST_DATABASE_URL?: string;
}
