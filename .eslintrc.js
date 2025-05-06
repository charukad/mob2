module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ["mobile/**/*.js", "mobile/**/*.jsx"],
      extends: ["@react-native-community"],
      plugins: ["react", "react-native"],
      rules: {
        "react-native/no-unused-styles": 2,
        "react-native/no-inline-styles": 2,
      },
    },
    {
      files: ["server/**/*.js"],
      env: {
        node: true,
      },
      rules: {
        "no-console": ["error", { allow: ["warn", "error", "info"] }],
      },
    },
  ],
};
