import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';

// Minimal flat config: enable ESLint for TS/TSX with a parser that provides
// parseForESLint. Keep rules minimal to avoid plugin resolution complexity.
export default [
  // Ignore common build and dependency folders so ESLint doesn't scan generated assets
  {
    ignores: ['dist/**', 'public/**', 'node_modules/**', 'vite-project.bak/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: {
        parseForESLint: tsParser.parseForESLint,
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {},
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    // Merge recommended rule sets for TypeScript and React conservatively
    plugins: { '@typescript-eslint': tsPlugin, react: reactPlugin },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Allow console during development in source files to reduce noise
      'no-console': 'off',
      'no-debugger': 'error',
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,
      // React recommended rules (merge but then override a few rules for TS projects)
      ...reactPlugin.configs.recommended.rules,
      // Not needed with new JSX transform and TypeScript — avoid false positives
      'react/react-in-jsx-scope': 'off',
      // Using TypeScript for type checking; prop-types are redundant
      'react/prop-types': 'off',
  // Require explicit typing — disallow `any` to encourage precise types
  '@typescript-eslint/no-explicit-any': 'error',
      // Let TypeScript handle unused vars more strictly; make lint warn instead of fail
  '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    },
  },
  // Basic JS rules for non-TS files so `eslint .` can run without errors.
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
    ...js.configs.recommended,
  },
  // Node scripts (build scripts, tooling) should use the Node env
  {
    files: ['scripts/**', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // allow console in scripts
      'no-console': 'off',
    },
  },
];