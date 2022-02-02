import { discordModule } from '$/bot/bot.module';
import { MessageService } from '$/bot/common/message.service';
import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerModule } from '../player/player.module';
import { ButtonService } from '../services/button.service';
import { MusicService } from '../services/music.service';
import { MomsMusicGateway } from './moms-music.gateway';
import { MomsMusicService } from './moms-music.service';

describe('MomsMusicGateway', () => {
	let gateway: MomsMusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule, PlayerModule],
			controllers: [MomsMusicGateway],
			providers: [MusicService, MessageService, MomsMusicService, ButtonService],
		}).compile();

		gateway = module.get<MomsMusicGateway>(MomsMusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
