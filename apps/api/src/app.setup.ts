import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

/**
 * Global HTTP setup shared by `main.ts` and the e2e suite, so tests exercise the
 * same prefix and validation pipeline the running server uses. CORS stays in
 * `main.ts` — it needs config and has no bearing on in-process tests.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
