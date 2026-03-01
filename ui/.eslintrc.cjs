/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks', 'irlwork'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // irlwork custom rules — all warnings so they don't block builds
    'irlwork/no-inline-card-pattern': 'warn',
    'irlwork/no-inline-button-pattern': 'warn',
    'irlwork/no-orange-outside-button': 'warn',
    'irlwork/no-title-case-ui-strings': 'warn',
    'irlwork/no-exclamation-in-ui': 'warn',
    'irlwork/no-emoji-in-ui': 'warn',

    // React basics
    'react/jsx-uses-react': 'off', // Not needed with React 17+ JSX transform
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      // Relax rules for the shared UI component library itself
      files: ['src/components/ui/Button.jsx'],
      rules: {
        'irlwork/no-orange-outside-button': 'off',
        'irlwork/no-inline-button-pattern': 'off',
      },
    },
    {
      files: ['src/components/ui/Card.jsx'],
      rules: {
        'irlwork/no-inline-card-pattern': 'off',
      },
    },
  ],
};
