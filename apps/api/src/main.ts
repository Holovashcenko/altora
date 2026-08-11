import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { isSwaggerEnabled, setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  await app.listen(config.get<number>('PORT')!);
}

void bootstrap();
