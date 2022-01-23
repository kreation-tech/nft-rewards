/* eslint-disable comma-dangle */
/* eslint-disable quote-props */
module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
    "no-tabs": "off",
    "indent": "off",
    "space-before-function-paren": "off",
    "quotes": ["error", "double"],
    "semi": ["error", "always"]
  },
};