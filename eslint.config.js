import globals from 'globals';
import js from '@eslint/js';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsEsLintParser from '@typescript-eslint/parser';
import prettierFlat from 'eslint-config-prettier/flat';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';

// Extract TS plugin's type-checking config without its "extends" property
const { configs: tsConfigs } = tsEsLintPlugin;
const rawTypeCheckingConfig = tsConfigs['recommended-requiring-type-checking'];
const { extends: _removedExtends, ...typeCheckingConfig } = rawTypeCheckingConfig;

export default [
  js.configs.recommended,
  typeCheckingConfig,
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', 'dist/**'],
    plugins: {
      '@typescript-eslint': tsEsLintPlugin,
      prettier: prettierPlugin
    },
    languageOptions: {
      globals: globals.browser,
      parser: tsEsLintParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd()
      }
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['**/*.test.ts'],
    plugins: {
      '@typescript-eslint': tsEsLintPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest
      },
      parser: tsEsLintParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd()
      }
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/unbound-method': 'warn'
    }
  },
  prettierFlat,
];
