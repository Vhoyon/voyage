import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { InteractionsGateway } from './interactions.gateway';
import { PlayerModule } from './player/player.module';
import { ButtonService } from './services/button.service';
import { HistoryService } from './services/history.service';
import { MusicService } from './services/music.service';

describe('PlayerGateway', () => {
	let gateway: InteractionsGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule, DiscordModule.forFeature(), PlayerModule],
			controllers: [InteractionsGateway],
			providers: [MusicService, MessageService, ButtonService, HistoryService],
		}).compile();

		gateway = module.get<InteractionsGateway>(InteractionsGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
