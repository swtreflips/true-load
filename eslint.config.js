import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // engine/ is the boundary that gets extracted into the Stuffer Planner later:
    // pure TypeScript, zero runtime deps, no DOM/React/Three.js. Enforced mechanically
    // so the boundary can't erode silently (see PLAN.md §9 risk 5).
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['three', 'three/*'], message: 'engine/ must stay Three.js-free.' },
            { group: ['@react-three/*'], message: 'engine/ must stay Three.js-free.' },
            { group: ['react', 'react-dom', 'react/*'], message: 'engine/ must stay React-free.' },
            { group: ['zustand', 'zustand/*'], message: 'engine/ must not depend on the store.' },
            { group: ['*/viewer/*', '*/ui/*', '*/store/*'], message: 'engine/ may not import viewer/ui/store.' },
          ],
        },
      ],
    },
  },
)
