import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { DiscordModule } from '@discord-nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerModule } from '../player/player.module';
import { ButtonService } from './button.service';
import { HistoryService } from './history.service';
import { MusicService } from './music.service';

describe('MusicService', () => {
	let service: MusicService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule, DiscordModule.forFeature(), PlayerModule],
			providers: [MusicService, MessageService, ButtonService, HistoryService],
		}).compile();

		service = module.get<MusicService>(MusicService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
