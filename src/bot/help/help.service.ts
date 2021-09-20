import { Injectable } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MethodResolver } from 'discord-nestjs/dist/packages/core/resolver/interface/method-resolver';
import { DescriptorResolver } from './descriptor.resolver';

export function IsObject(instance: unknown): boolean {
	return typeof instance === 'object' ? instance !== null : typeof instance === 'function';
}

@Injectable()
export class HelpService {
	constructor(private readonly metadataScanner: MetadataScanner, private readonly descriptorResolver: DescriptorResolver) {}

	async getCommandsDescriptions(providers: InstanceWrapper[], controllers: InstanceWrapper[]) {
		return this.resolveDecorators(providers, controllers);
	}

	protected async resolveDecorators(providers: InstanceWrapper[], controllers: InstanceWrapper[]) {
		const methodResolvers: MethodResolver[] = [this.descriptorResolver];

		return Promise.all(
			providers.concat(controllers).map(async (instanceWrapper: InstanceWrapper) => {
				const { instance } = instanceWrapper;

				if (!instance || !IsObject(instance)) {
					return;
				}
				// for await (const resolver of classResolvers) {
				// 	await resolver.resolve({ instance });
				// }
				const methodNames = this.scanMetadata(instance);

				return Promise.all(
					methodNames.map(async (methodName: string) => {
						for await (const resolver of methodResolvers) {
							await resolver.resolve({
								instance,
								methodName,
							});
						}
					}),
				);
			}),
		);
	}

	protected scanMetadata(instance: unknown) {
		return this.metadataScanner.scanFromPrototype(instance, Object.getPrototypeOf(instance), (methodName: string) => methodName);
	}
}
