import type { AuthResponse, AuthUser } from '@altora/types';
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { ErrorResponseDto, ValidationErrorResponseDto } from '../common/dto/error-response.dto';

/** Applied to the two body-carrying routes; `GET /auth/me` has nothing to validate. */
const ApiInvalidBody = (): MethodDecorator =>
  ApiBadRequestResponse({
    description: 'The body failed validation.',
    type: ValidationErrorResponseDto,
  });

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register an owner account',
    description:
      'Open signup: every account created here owns its own restaurant. Manager and staff ' +
      'accounts arrive by invite in Restaurant management. Returns a token, so the client is ' +
      'signed in straight after registering.',
  })
  @ApiCreatedResponse({ description: 'The account was created.', type: AuthResponseDto })
  @ApiConflictResponse({ description: 'The email is already registered.', type: ErrorResponseDto })
  @ApiInvalidBody()
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange credentials for an access token',
    description: 'Emails are matched case-insensitively.',
  })
  @ApiOkResponse({ description: 'The credentials matched.', type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Unknown email or wrong password — the two are deliberately indistinguishable.',
    type: ErrorResponseDto,
  })
  @ApiInvalidBody()
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /**
   * Access tokens are stateless, so there is no logout endpoint — the client drops
   * the token. Server-side invalidation needs a denylist (Redis) and refresh tokens.
   */
  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Return the signed-in account',
    description:
      'Resolved from the bearer token on every call, so a deleted account stops authenticating ' +
      'immediately even while its token is still within its lifetime.',
  })
  @ApiOkResponse({ description: 'The token is valid.', type: AuthUserDto })
  @ApiUnauthorizedResponse({
    description: 'The token is missing, malformed, expired, or its account no longer exists.',
    type: ErrorResponseDto,
  })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
