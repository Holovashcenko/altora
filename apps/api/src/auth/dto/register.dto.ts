import type { RegisterRequest } from '@altora/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto implements RegisterRequest {
  @ApiProperty({ format: 'email', example: 'owner@altora.test' })
  @IsEmail()
  email!: string;

  /** bcrypt silently ignores bytes past 72, so reject longer passwords instead. */
  @ApiProperty({
    format: 'password',
    minLength: 8,
    maxLength: 72,
    example: 'correct-horse-battery',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Alex Rivera' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
