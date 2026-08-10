import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  PORT?: number = 4000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = 'http://localhost:5173';

  @IsString()
  DATABASE_URL!: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
