import { Module } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { ReflectMetadataProvider } from 'discord-nestjs/dist/packages/core/provider/reflect-metadata.provider';
import { DescriptorResolver } from './descriptor.resolver';
import { HelpGateway } from './help.gateway';
import { HelpService } from './help.service';

@Module({
	providers: [HelpGateway, DiscoveryService, MetadataScanner, ReflectMetadataProvider, DescriptorResolver, HelpService],
})
export class HelpModule {}
