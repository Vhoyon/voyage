import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';

@Module({
	imports: [ConfigModule],
	providers: [],
})
export class AppModule {}
