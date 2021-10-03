import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EnvironmentConfig } from './@common/env.validation';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);

	app.enableCors({ origin: '*' });

	app.useGlobalPipes(new ValidationPipe({ transform: true }));

	const env = app.get(EnvironmentConfig);

	const port = env.PORT;

	app.enableShutdownHooks();

	await app.listen(port);

	console.log(`Server launched on port ${port}!`);
}

bootstrap();
