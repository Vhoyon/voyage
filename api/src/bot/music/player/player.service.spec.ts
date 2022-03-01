import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { ButtonService } from '../services/button.service';
import { HistoryService } from '../services/history.service';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
	let service: PlayerService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			providers: [PlayerService, MessageService, ButtonService, HistoryService],
		}).compile();

		service = module.get<PlayerService>(PlayerService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
