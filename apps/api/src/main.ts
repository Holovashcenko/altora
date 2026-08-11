import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { isSwaggerEnabled, setupSwagger } from './swagger';

const DEFAULT_PORT = 4000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
