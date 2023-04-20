import { discordModule } from '$/bot/bot.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MomsMusicGateway } from './moms-music.gateway';
import { MomsMusicModule } from './moms-music.module';

describe('MomsMusicGateway', () => {
	let gateway: MomsMusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [discordModule, DiscordModule.forFeature(), MomsMusicModule],
			controllers: [MomsMusicGateway],
			providers: [],
		}).compile();

		gateway = module.get<MomsMusicGateway>(MomsMusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
