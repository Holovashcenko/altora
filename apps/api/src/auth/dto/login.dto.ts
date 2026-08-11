import type { LoginRequest } from '@altora/types';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
