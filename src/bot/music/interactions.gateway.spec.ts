import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { InteractionsGateway } from './interactions.gateway';
import { MusicService } from './services/music.service';

describe('PlayerGateway', () => {
	let gateway: InteractionsGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			controllers: [InteractionsGateway],
			providers: [MusicService, MessageService],
		}).compile();

		gateway = module.get<InteractionsGateway>(InteractionsGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
