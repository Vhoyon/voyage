import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ReflectMetadataProvider } from 'discord-nestjs/dist/packages/core/provider/reflect-metadata.provider';
import { DescriptorResolver } from './descriptor.resolver';
import { HelpGateway } from './help.gateway';
import { HelpService } from './help.service';

describe('HelpGateway', () => {
	let gateway: HelpGateway;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [HelpGateway, DescriptorResolver, DiscoveryService, HelpService, MetadataScanner, ReflectMetadataProvider],
		}).compile();

		gateway = module.get<HelpGateway>(HelpGateway);
	});

	it('should be defined', () => {
		expect(gateway).toBeDefined();
	});
});
