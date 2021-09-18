import type { IGraphQLConfig } from 'graphql-config';
import { env } from './src/config.module';

const config: IGraphQLConfig = {
	schema: `http://localhost:${env.PORT}/graphql`,
};

export default config;
