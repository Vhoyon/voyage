import { forwardRef, Module } from '@nestjs/common';
import { discordModule } from '../bot.module';
import { MessageService } from './message.service';

@Module({
	imports: [forwardRef(() => discordModule)],
	providers: [MessageService],
	exports: [MessageService],
})
export class CommonModule {}
