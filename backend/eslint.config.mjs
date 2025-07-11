import typescriptEslint from "@typescript-eslint/eslint-plugin";
import preferArrow from "eslint-plugin-prefer-arrow";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "prefer-arrow": preferArrow,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
        },
    },

    rules: {
        "@typescript-eslint/array-type": ["error", {
            default: "array",
        }],

        "@typescript-eslint/dot-notation": "error",
        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/member-delimiter-style": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",

        "@typescript-eslint/triple-slash-reference": ["error", {
            path: "always",
            types: "prefer-import",
            lib: "always",
        }],

        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/prefer-promise-reject-errors": "warn",
        "@typescript-eslint/type-annotation-spacing": "off",
        "@typescript-eslint/unified-signatures": "error",
        "@typescript-eslint/no-misused-promises": "warn",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-base-to-string": "warn",
        camelcase: "off",
        complexity: "off",
        "constructor-super": "error",
        eqeqeq: ["error", "smart"],
        "guard-for-in": "error",

        "id-blacklist": [
            "error",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined",
        ],

        "id-match": "error",
        "jsdoc/check-alignment": "off",
        "jsdoc/check-indentation": "off",
        "jsdoc/newline-after-description": "off",
        "max-classes-per-file": ["error", 1],
        "new-parens": "error",
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": "error",
        "no-debugger": "error",
        "no-empty": "error",
        "no-eval": "error",
        "no-fallthrough": "off",
        "no-invalid-this": "off",
        "no-new-wrappers": "error",

        "no-shadow": ["error", {
            hoist: "all",
        }],

        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-undef-init": "error",
        "no-underscore-dangle": "off",
        "no-unsafe-finally": "error",
        "no-unused-labels": "error",
        "object-shorthand": "error",
        "one-var": ["error", "never"],

        "prefer-arrow/prefer-arrow-functions": ["warn", {
            disallowPrototype: true,
            singleReturnOnly: false,
            classPropertiesAllowed: false,
        }],

        radix: "error",

        "spaced-comment": ["error", "always", {
            markers: ["/"],
        }],

        "use-isnan": "error",
        "valid-typeof": "off",
    },
}];
