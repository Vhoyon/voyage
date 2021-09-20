import { Injectable } from '@nestjs/common';
import { ReflectMetadataProvider } from 'discord-nestjs/dist/packages/core/provider/reflect-metadata.provider';
import { MethodResolveOptions } from 'discord-nestjs/dist/packages/core/resolver/interface/method-resolve-options';
import { MethodResolver } from 'discord-nestjs/dist/packages/core/resolver/interface/method-resolver';

@Injectable()
export class DescriptorResolver implements MethodResolver {
	constructor(private readonly metadataProvider: ReflectMetadataProvider) {}

	resolve({ instance, methodName }: MethodResolveOptions) {
		const onCommandMetadata = this.metadataProvider.getOnCommandDecoratorMetadata(instance, methodName);

		if (!onCommandMetadata) {
			return;
		}

		// const { name: commandName } = onCommandMetadata;
	}
}
