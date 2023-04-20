import { TransformedCommandExecutionContext } from '@discord-nestjs/core';
import { CacheType, CommandInteraction, Interaction } from 'discord.js';

export type TransformedRealCommandExecutionContext<
	Cache extends CacheType = CacheType,
	TInteraction extends Interaction<Cache> = any,
> = TransformedCommandExecutionContext<TInteraction> & { interaction: CommandInteraction<Cache> };
