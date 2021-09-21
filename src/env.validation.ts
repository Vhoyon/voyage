import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum Environment {
	Development = 'development',
	Production = 'production',
	Test = 'test',
}

export const DEFAULT_PORT = 3000;

export const DEFAULT_GRAPHQL_DEPTH_LIMIT = 10;

export const DEFAULT_DISCORD_PREFIX = '!';

export const DEFAULT_DISCORD_MUSIC_DISCONNECT_TIMEOUT = 60;

export class EnvironmentConfig {
	@IsEnum(Environment)
	readonly NODE_ENV: Environment = Environment.Development;

	@Type(() => Number)
	@IsNumber()
	readonly PORT: number = DEFAULT_PORT;

	@Type(() => Number)
	@IsNumber()
	readonly GRAPHQL_DEPTH_LIMIT: number = DEFAULT_GRAPHQL_DEPTH_LIMIT;

	@IsString()
	readonly KEY!: string;

	// ---------------
	//     DISCORD
	// ---------------

	@IsString()
	readonly DISCORD_TOKEN!: string;

	@IsOptional()
	@IsString()
	readonly DISCORD_PREFIX: string = DEFAULT_DISCORD_PREFIX;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	readonly DISCORD_MUSIC_DISCONNECT_TIMEOUT: number = DEFAULT_DISCORD_MUSIC_DISCONNECT_TIMEOUT;

	@IsString()
	readonly YOUTUBE_API_KEY!: string;

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
