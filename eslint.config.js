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
    // Fichiers de migration en CommonJS
    files: ['**/migrations/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'core/client/dist/**',
      'coverage/**',
      'uploads/**',
      '*.config.js',
      '*.config.ts',
      '**/*.d.ts',
    ],
  },
];
