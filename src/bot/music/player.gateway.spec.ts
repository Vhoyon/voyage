import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { PlayerGateway } from './player.gateway';
import { MusicService } from './services/music.service';

describe('PlayerGateway', () => {
	let gateway: PlayerGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			controllers: [PlayerGateway],
			providers: [MusicService, MessageService],
		}).compile();

		gateway = module.get<PlayerGateway>(PlayerGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
