import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

const restrictedImports = [
  'error',
  {
    patterns: [
      {
        group: [
          '**/dist/**',
          '**/dist-public/**',
          '@goliatone/go-admin-client',
          '@goliatone/go-admin-client/*',
        ],
        message: 'Production source must import source modules directly, not generated or published package artifacts.',
      },
    ],
  },
];

export default [
  {
    ignores: [
      'dist/**',
      'dist-public/**',
      'dist-types/**',
      '.dist-staging/**',
      '.dist-prev/**',
      'node_modules/**',
      'tests/**',
      'scripts/**',
      'vite.config.ts',
      'vite.public.config.ts',
    ],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      complexity: ['warn', 25],
      'no-console': 'error',
      'no-restricted-imports': restrictedImports,
      'no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      complexity: ['warn', 25],
      'no-console': 'error',
      'no-restricted-imports': restrictedImports,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/shared/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
