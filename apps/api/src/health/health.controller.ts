import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from './dto/health-response.dto';

/** Liveness probe used by Docker, nginx and CI. Not a domain endpoint. */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Returns `ok` as soon as the API can serve requests.',
  })
  @ApiOkResponse({ description: 'The API is up.', type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
