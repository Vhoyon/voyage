import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerModule } from '../player/player.module';
import { MomsMusicService } from './moms-music.service';

describe('MomsMusicService', () => {
	let service: MomsMusicService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [PrismaModule, discordModule, PlayerModule],
			providers: [MomsMusicService, MessageService],
		}).compile();

		service = module.get<MomsMusicService>(MomsMusicService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
