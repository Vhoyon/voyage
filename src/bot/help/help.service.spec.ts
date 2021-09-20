import { MetadataScanner } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ReflectMetadataProvider } from 'discord-nestjs/dist/packages/core/provider/reflect-metadata.provider';
import { DescriptorResolver } from './descriptor.resolver';
import { HelpService } from './help.service';

describe('HelpService', () => {
	let service: HelpService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [HelpService, MetadataScanner, DescriptorResolver, ReflectMetadataProvider],
		}).compile();

		service = module.get<HelpService>(HelpService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
