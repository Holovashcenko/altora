import { Controller, Get } from '@nestjs/common';

/** Liveness probe used by Docker, nginx and CI. Not a domain endpoint. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
