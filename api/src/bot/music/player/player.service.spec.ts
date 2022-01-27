import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
	let service: PlayerService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			providers: [PlayerService, MessageService],
		}).compile();

		service = module.get<PlayerService>(PlayerService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
