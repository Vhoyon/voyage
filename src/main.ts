import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvironmentConfig } from './env.validation';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);

	app.enableCors({ origin: '*' });

	app.useGlobalPipes(new ValidationPipe({ transform: true }));

	const env = app.get(EnvironmentConfig);

	const port = env.PORT;

	await app.listen(port);

	console.log(`Server launched on port ${port}!`);
}

bootstrap();
