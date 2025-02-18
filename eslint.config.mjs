import mocha from "eslint-plugin-mocha";
import globals from "globals";
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

export default [...compat.extends("airbnb", "plugin:mocha/recommended"), {
    plugins: {
        mocha,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            describe: true,
            it: true,
            before: true,
            after: true,
            beforeEach: true,
            afterEach: true,
        },

        ecmaVersion: 2022,
        sourceType: "module",
    },

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".es6", ".coffee"],
                paths: ["/usr/local/share/global_modules"],
                moduleDirectory: ["node_modules", "app/src"],
            },
        },
    },

    rules: {
        "max-len": [1, 200, 2, {
            ignoreUrls: true,
        }],

        curly: [2, "multi-line"],
        "comma-dangle": [0, "always-multiline"],
        "no-plusplus": 0,
        eqeqeq: [2, "allow-null"],
        "global-require": 0,
        "no-shadow": 1,

        "no-param-reassign": [2, {
            props: false,
        }],

        indent: [2, 4, {
            SwitchCase: 1,
        }],

        "padded-blocks": [2, {
            switches: "always",
            classes: "always",
        }],

        quotes: [2, "single", {
            allowTemplateLiterals: true,
        }],

        "no-underscore-dangle": ["error", {
            allow: ["_id"],
        }],

        "import/no-extraneous-dependencies": ["error", {
            devDependencies: ["app/test/**"],
        }],

        "no-await-in-loop": "off",
        "mocha/no-mocha-arrows": [0],
        "mocha/no-hooks-for-single-case": [0],
    },
}];
