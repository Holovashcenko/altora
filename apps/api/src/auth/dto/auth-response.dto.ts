import type { AuthResponse, AuthTokens } from '@altora/types';
import { ApiProperty } from '@nestjs/swagger';

import { AuthUserDto } from './auth-user.dto';

export class AuthTokensDto implements AuthTokens {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZjFjN2MxZSJ9.7mJ0Qc0v9Q',
    description:
      'Bearer token for the `Authorization` header. Stateless — there is no logout endpoint, ' +
      'the client drops the token.',
  })
  accessToken!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}
