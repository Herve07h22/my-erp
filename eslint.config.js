import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Browser globals (pour le client)
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // Règles personnalisées
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Permettre console.log en développement
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'core/client/dist/**',
      'uploads/**',
      '*.config.js',
      '*.config.ts',
      '**/*.d.ts',
    ],
  },
];
