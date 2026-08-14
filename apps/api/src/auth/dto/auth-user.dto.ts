import type { AuthUser, UserRole, Restaurant } from '@altora/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    enum: ['owner', 'manager', 'staff'],
    example: 'owner',
    description: 'Per-restaurant role from active membership.',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Active restaurant from membership, if any.',
    example: {
      id: 'r_1',
      name: "Alex's Restaurant",
      slug: 'alex-restaurant',
      timezone: 'UTC',
      currency: 'USD',
      createdAt: '2026-01-15T09:24:11.000Z',
      updatedAt: '2026-01-15T09:24:11.000Z',
    },
  })
  restaurant?: Restaurant;

  @ApiProperty({ format: 'date-time', example: '2026-01-15T09:24:11.000Z' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-01-15T09:24:11.000Z' })
  updatedAt!: string;
}
