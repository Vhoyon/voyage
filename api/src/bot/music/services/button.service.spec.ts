import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ButtonService } from './button.service';
import { HistoryService } from './history.service';

describe('ButtonService', () => {
	let service: ButtonService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule, DiscordModule.forFeature()],
			providers: [ButtonService, HistoryService, MessageService],
		}).compile();

		service = module.get<ButtonService>(ButtonService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
