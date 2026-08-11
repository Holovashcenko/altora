import type { RegisterRequest } from '@altora/types';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;

  /** bcrypt silently ignores bytes past 72, so reject longer passwords instead. */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
