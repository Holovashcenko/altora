import type { LoginRequest } from '@altora/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto implements LoginRequest {
  @ApiProperty({
    format: 'email',
    example: 'owner@altora.test',
    description: 'Matched case-insensitively.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: 'password', example: 'correct-horse-battery' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
