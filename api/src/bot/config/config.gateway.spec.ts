import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { discordModule } from '../bot.module';
import { DiscordConfigGateway } from './config.gateway';

describe('ConfigGateway', () => {
	let gateway: DiscordConfigGateway;
	let module: TestingModule;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			imports: [discordModule, PrismaModule],
			controllers: [DiscordConfigGateway],
		}).compile();

		gateway = module.get<DiscordConfigGateway>(DiscordConfigGateway);
	});

	afterAll(async () => {
		await module.close();
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
