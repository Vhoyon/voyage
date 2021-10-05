import { MessageService } from '$/bot/common/message.service';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { BlacklistService } from './blacklist.service';

describe('BlacklistService', () => {
	let service: BlacklistService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [BlacklistService, MessageService],
		}).compile();

		service = module.get<BlacklistService>(BlacklistService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
