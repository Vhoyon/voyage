import { discordModule } from '$/bot/bot.module';
import { ConfigModule } from '$common/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MusicService } from './music.service';

describe('MusicService', () => {
	let service: MusicService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			providers: [MusicService],
		}).compile();

		service = module.get<MusicService>(MusicService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
