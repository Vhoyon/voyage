import { ConfigModule } from '$/config.module';
import { PrismaModule } from '$/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { BlacklistGateway } from './blacklist.gateway';
import { BlacklistService } from './services/blacklist.service';

describe('BlacklistGateway', () => {
	let gateway: BlacklistGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule],
			controllers: [BlacklistGateway],
			providers: [BlacklistService],
		}).compile();

		gateway = module.get<BlacklistGateway>(BlacklistGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
