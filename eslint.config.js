import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      // A checkout of this repo made for an agent to work in, not source of its own.
      '.claude/worktrees/**',
      // Deno, not the app: different runtime, different globals, its own type-checking.
      'supabase/functions/**',
      // A screenshot tool for looking at the collectors' app; it holds no product logic.
      'apps/field/test/**',
      // Build-time checkers, like their Python sibling design/check-screens.py. They run under
      // node before the app is built and are not part of either app's source.
      'design/*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Root config files sit outside any workspace tsconfig, and so do the two static
          // modules served from public/ rather than built with an app: the audio worklet, and the
          // field app's service worker.
          allowDefaultProject: [
            '*.config.js',
            '*.config.ts',
            'apps/pwa/public/*.js',
            'apps/field/public/*.js',
            'apps/pwa/test/*.mjs',
          ],
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
    // The browser harness and its server run in Node against a real Chromium, outside the app's
    // TypeScript project: one drives a browser, one serves files, neither is shipped.
    files: ['apps/pwa/public/*.js', 'apps/pwa/test/*.mjs'],
    // `extends`, not a spread: a spread puts disableTypeChecked's `rules` on this object, where
    // the `rules` below then replaces it wholesale and every type-aware rule comes back on.
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node,
        AudioWorkletProcessor: 'readonly',
        registerProcessor: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        AudioContext: 'readonly',
        AudioWorkletNode: 'readonly',
        WebAssembly: 'readonly',
        Worker: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      // These are command-line tools: their whole output is what they print. The rule exists to
      // keep stray logging out of the app, and they are not the app.
      'no-console': 'off',
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
    // The content pipeline is a command-line tool: stdout is how it reports what it published
    // and what it dropped, which is the only way a person sees the result. `warn`/`error` would
    // put ordinary output on stderr.
    files: ['packages/content-tools/src/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // The field app's service worker: a plain script in a scope that is neither a window nor node,
    // where `self` is the worker itself and `clients` and `caches` are globals. It ships as-is from
    // public/, so there are no build types to check it against.
    files: ['apps/field/public/sw.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.serviceworker },
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
