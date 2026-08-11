import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Served from the app root, so it sits next to the `api` global prefix. */
const DOCS_PATH = 'api/docs';
const JSON_DOCS_PATH = 'api/docs.json';

/**
 * Docs are on everywhere except production, where they are opt-in via
 * `SWAGGER_ENABLED=true` so a public deployment does not leak its surface.
 */
export function isSwaggerEnabled(): boolean {
  const flag = process.env.SWAGGER_ENABLED;

  if (flag !== undefined) {
    return flag === 'true';
  }

  return process.env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Altora API')
    .setDescription('REST API for Altora — the Restaurant Operating System.')
    .setVersion('0.0.0')
    // Registered ahead of the auth module so protected endpoints only need
    // `@ApiBearerAuth()` once they land.
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addTag('Health', 'Liveness probes for Docker, nginx and CI')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: JSON_DOCS_PATH,
    swaggerOptions: { persistAuthorization: true },
  });
}
