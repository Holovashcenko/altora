import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of the globally registered `JwtAuthGuard`. */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
