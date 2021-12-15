import { ConfigModule } from '$common/configs/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { MessageService } from './message.service';

describe('MessageService', () => {
	let service: MessageService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [discordModule, ConfigModule],
			providers: [MessageService],
		}).compile();

		service = module.get<MessageService>(MessageService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
