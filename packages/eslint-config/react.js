import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

import base from './base.js';

/** Configuration for React code — the admin app and the shared UI package. */
export default tseslint.config(...base, {
  files: ['**/*.{ts,tsx,js,jsx}'],
  languageOptions: {
    globals: { ...globals.browser },
  },
  plugins: {
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
});
