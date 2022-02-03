import { discordModule } from '$/bot/bot.module';
import { Test, TestingModule } from '@nestjs/testing';
import { MomsMusicGateway } from './moms-music.gateway';
import { MomsMusicModule } from './moms-music.module';

describe('MomsMusicGateway', () => {
	let gateway: MomsMusicGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [discordModule, MomsMusicModule],
			controllers: [MomsMusicGateway],
			providers: [],
		}).compile();

		gateway = module.get<MomsMusicGateway>(MomsMusicGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
