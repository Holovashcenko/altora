import type { AuthUser, UserRole } from '@altora/types';
import { ApiProperty } from '@nestjs/swagger';

/** Documents the `AuthUser` contract from `@altora/types`; never carries the password hash. */
export class AuthUserDto implements AuthUser {
  @ApiProperty({
    format: 'uuid',
    example: '9f1c7c1e-3d3a-4a4f-9a1f-2c9f0f1b7a10',
    description: 'Stable identifier of the account.',
  })
  id!: string;

  @ApiProperty({ format: 'email', example: 'owner@altora.test' })
  email!: string;

  @ApiProperty({ example: 'Alex Rivera' })
  name!: string;

  @ApiProperty({
    enum: ['owner', 'manager', 'staff'],
    example: 'owner',
    description: 'Accounts created through `/auth/register` are always owners in v1.',
  })
  role!: UserRole;

  @ApiProperty({ format: 'date-time', example: '2026-01-15T09:24:11.000Z' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-01-15T09:24:11.000Z' })
  updatedAt!: string;
}
