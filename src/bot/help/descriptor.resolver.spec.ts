import { Test, TestingModule } from '@nestjs/testing';
import { ReflectMetadataProvider } from 'discord-nestjs/dist/packages/core/provider/reflect-metadata.provider';
import { DescriptorResolver } from './descriptor.resolver';

describe('DescriptorResolver', () => {
	let resolver: DescriptorResolver;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [DescriptorResolver, ReflectMetadataProvider],
		}).compile();

		resolver = module.get<DescriptorResolver>(DescriptorResolver);
	});

	it('should be defined', () => {
		expect(resolver).toBeDefined();
	});
});
