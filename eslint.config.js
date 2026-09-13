import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/dev-dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Root config files sit outside any workspace tsconfig, and so does the audio worklet,
          // which is a static module served from public/ rather than part of the app's build.
          allowDefaultProject: ['*.config.js', '*.config.ts', 'apps/pwa/public/*.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // A disable needs a stated reason — see "Code quality gates" in CLAUDE.md.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSUnknownKeyword',
          message:
            'Double-casting through `unknown` hides a type problem. Model the boundary properly.',
        },
      ],
    },
  },
  {
    // Config files run in Node, not the browser, and sit outside the workspace tsconfigs —
    // syntactic linting only, so type-aware rules do not need a program for them.
    // The audio worklet is plain JS served as its own module from public/, so it sits outside
    // the TypeScript project on purpose. Type-aware rules cannot run on a file the project does
    // not contain, and it runs in AudioWorkletGlobalScope, which has neither window nor the DOM.
    files: ['apps/pwa/public/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { AudioWorkletProcessor: 'readonly', registerProcessor: 'readonly' },
    },
  },
  {
    files: ['**/*.config.{js,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
);
