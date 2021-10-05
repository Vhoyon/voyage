import { ConfigModule } from '$common/configs/config.module';
import { PrismaModule } from '$common/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { MessageService } from '../common/message.service';
import { MusicGateway } from './music.gateway';
import { MusicService } from './services/music.service';

describe('MusicGateway', () => {
	let gateway: MusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule, PrismaModule, discordModule],
			providers: [MusicGateway, MusicService, MessageService],
		}).compile();

		gateway = module.get<MusicGateway>(MusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
