import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    example: 'ok',
    description: 'Always `ok` — a failing API never answers this route.',
  })
  status: string;
}
