import { discordModule } from '$/bot/bot.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MomsMusicModule } from './moms-music.module';
import { MomsMusicService } from './moms-music.service';

describe('MomsMusicService', () => {
	let service: MomsMusicService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [discordModule, MomsMusicModule],
			providers: [],
		}).compile();

		service = module.get<MomsMusicService>(MomsMusicService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
