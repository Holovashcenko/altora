import type { AuthResponse, AuthUser } from '@altora/types';
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /**
   * Access tokens are stateless, so there is no logout endpoint — the client drops
   * the token. Server-side invalidation needs a denylist (Redis) and refresh tokens.
   */
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
