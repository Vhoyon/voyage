import { ConfigModule } from '$/config.module';
import { PrismaModule } from '$/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MusicService } from './music.service';
import { YoutubeService } from './providers/youtube.service';

describe('MusicService', () => {
	let service: MusicService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule],
			providers: [MusicService, YoutubeService],
		}).compile();

		service = module.get<MusicService>(MusicService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
