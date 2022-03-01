import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
	let service: HistoryService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [PrismaModule, discordModule, ConfigModule],
			providers: [HistoryService, MessageService],
		}).compile();

		service = module.get<HistoryService>(HistoryService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
