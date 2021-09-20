import { ConfigModule } from '$/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { YoutubeService } from './youtube.service';

describe('YoutubeService', () => {
	let service: YoutubeService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule],
			providers: [YoutubeService],
		}).compile();

		service = module.get<YoutubeService>(YoutubeService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
