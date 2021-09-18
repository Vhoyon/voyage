import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { GraphQLModule } from './graphql.module';
import { MessageModule } from './message/message.module';
import { PubSub } from './pub-sub';

@Module({
	imports: [GraphQLModule, ConfigModule, MessageModule],
	providers: [PubSub],
})
export class AppModule {}
