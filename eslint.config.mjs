import js from "@eslint/js";
import globals from "globals";
//import reactHooks from 'eslint-plugin-react-hooks'
//import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "locale/"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      // 'react-hooks': reactHooks,
      // 'react-refresh': reactRefresh,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty-pattern": "off",
      "no-useless-escape": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-case-declarations": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-empty": "off",
      "no-debugger": "off",
      "prefer-spread": "off"
      //...reactHooks.configs.recommended.rules,
      // "react-refresh/only-export-components": [
      //   "warn",
      //   { allowConstantExport: true }
      // ]
    }
  }
);