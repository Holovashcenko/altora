import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator';

/** Liveness probe used by Docker, nginx and CI. Not a domain endpoint. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
