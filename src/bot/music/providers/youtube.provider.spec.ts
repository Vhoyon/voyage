import { ConfigModule } from '$/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { YoutubeProvider } from './youtube.provider';

describe('YoutubeService', () => {
	let service: YoutubeProvider;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule],
			providers: [YoutubeProvider],
		}).compile();

		service = module.get<YoutubeProvider>(YoutubeProvider);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
