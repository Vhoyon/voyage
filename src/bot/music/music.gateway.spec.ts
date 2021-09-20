import { ConfigModule } from '$/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MusicGateway } from './music.gateway';
import { MusicService } from './music.service';
import { YoutubeService } from './services/youtube.service';

describe('MusicGateway', () => {
	let gateway: MusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule],
			providers: [MusicGateway, MusicService, YoutubeService],
		}).compile();

		gateway = module.get<MusicGateway>(MusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
