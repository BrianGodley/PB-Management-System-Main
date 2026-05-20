// ESLint flat config (ESLint 9+) for the PBS landscape estimator.
//
// Scope: lints src/ only. Style/formatting is owned by Prettier — this config
// deliberately leaves formatting rules off and focuses on real bugs:
// undefined variables, unused variables, and React hooks correctness.
//
// Run:  npm run lint        (report)
//       npm run lint:fix    (auto-fix what's safe)
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Paths ESLint should never touch.
  {
    ignores: [
      'dist',
      'node_modules',
      'supabase/functions/**', // Deno runtime — different globals/module system
      'supabase/.temp/**',
      '*.config.js',
      'scripts/**',
    ],
  },

  // Application source.
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules, // new JSX transform — no `import React` needed
      ...reactHooks.configs.recommended.rules,

      // Real-bug rules we care about.
      'no-undef': 'error',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Off: noise for this codebase / owned by Prettier.
      'react/prop-types': 'off', // no PropTypes in use; would flag every component
      'react/no-unescaped-entities': 'off', // apostrophes in copy are intentional
      'no-empty': ['warn', { allowEmptyCatch: true }], // empty catch is a known fail-soft pattern here
    },
  },
]
