import globals from 'globals';
import tseslint from 'typescript-eslint';

import base from './base.js';

/** Configuration for NestJS services. */
export default tseslint.config(...base, {
  files: ['**/*.ts'],
  languageOptions: {
    globals: { ...globals.node, ...globals.jest },
  },
  rules: {
    // Nest's decorator metadata and DI surface routinely produce `any` at the
    // framework boundary; flag it without blocking the build.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
});
