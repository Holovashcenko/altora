import { ApiProperty } from '@nestjs/swagger';

/** The body Nest's built-in exception filter returns for any `HttpException`. */
export class ErrorResponseDto {
  @ApiProperty({ example: 401, description: 'Repeats the HTTP status code.' })
  statusCode!: number;

  @ApiProperty({ example: 'Invalid credentials' })
  message!: string;

  @ApiProperty({ example: 'Unauthorized', description: 'Reason phrase for the status code.' })
  error!: string;
}

/** `ValidationPipe` reports one message per failed constraint, so `message` is a list. */
export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    type: [String],
    example: ['email must be an email', 'password must be longer than or equal to 8 characters'],
  })
  message!: string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
