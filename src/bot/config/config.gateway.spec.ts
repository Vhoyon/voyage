import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { ConfigGateway } from './config.gateway';

describe('ConfigGateway', () => {
	let gateway: ConfigGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [discordModule],
			providers: [ConfigGateway],
		}).compile();

		gateway = module.get<ConfigGateway>(ConfigGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
