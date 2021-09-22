import { ConfigModule } from '$/config.module';
import { PrismaModule } from '$/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MusicGateway } from './music.gateway';
import { YoutubeService } from './providers/youtube.service';
import { MusicService } from './services/music.service';

describe('MusicGateway', () => {
	let gateway: MusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule],
			providers: [MusicGateway, MusicService, YoutubeService],
		}).compile();

		gateway = module.get<MusicGateway>(MusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
