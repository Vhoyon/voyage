import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ButtonService } from '../services/button.service';
import { HistoryService } from '../services/history.service';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
	let service: PlayerService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule, DiscordModule.forFeature()],
			providers: [PlayerService, MessageService, ButtonService, HistoryService],
		}).compile();

		service = module.get<PlayerService>(PlayerService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
