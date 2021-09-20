import { Test, TestingModule } from '@nestjs/testing';
import { discordModule } from '../bot.module';
import { ConfigGateway } from './config.gateway';

describe('ConfigGateway', () => {
	let gateway: ConfigGateway;
	let module: TestingModule;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			imports: [discordModule],
			providers: [ConfigGateway],
		}).compile();

		gateway = module.get<ConfigGateway>(ConfigGateway);
	});

	afterAll(async () => {
		await module.close();
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
