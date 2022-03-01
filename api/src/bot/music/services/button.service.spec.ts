import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { ButtonService } from './button.service';
import { HistoryService } from './history.service';

describe('ButtonService', () => {
	let service: ButtonService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ButtonService, HistoryService],
		}).compile();

		service = module.get<ButtonService>(ButtonService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
