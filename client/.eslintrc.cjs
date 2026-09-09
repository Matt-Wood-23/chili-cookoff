module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // This project passes props positionally and destructures more than it uses;
    // that is style, not a defect worth failing the build over.
    'react/prop-types': 'off',
    // Vite uses the automatic JSX runtime, so the React import is vestigial but
    // harmless. Unused destructured props are likewise not errors here.
    'no-unused-vars': ['error', {
      varsIgnorePattern: '^React$',
      args: 'none',
      ignoreRestSiblings: true
    }]
  }
};
