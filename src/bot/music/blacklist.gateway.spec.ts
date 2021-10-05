import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from '../common/message.service';
import { BlacklistGateway } from './blacklist.gateway';
import { BlacklistService } from './services/blacklist.service';

describe('BlacklistGateway', () => {
	let gateway: BlacklistGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule],
			controllers: [BlacklistGateway],
			providers: [BlacklistService, MessageService],
		}).compile();

		gateway = module.get<BlacklistGateway>(BlacklistGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
