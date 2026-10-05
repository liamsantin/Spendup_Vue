import { defineConfig } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tseslint from 'typescript-eslint';
import prettierConfig from '@vue/eslint-config-prettier';

// Les configs typescript-eslint ciblent `**/*.ts` : on les étend aux SFC `.vue`.
const withVueFiles = (config) => (config.files?.includes('**/*.ts') ? { ...config, files: [...config.files, '**/*.vue'] } : config);

export default defineConfig(
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mjs,js,vue}']
    },
    {
        name: 'app/files-to-ignore',
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/coverage/**',
            '**/_template/**',
            // Artefacts Cargo / Tauri (générés) — ne jamais lint
            '**/src-tauri/target/**',
            '**/src-tauri/gen/**'
        ]
    },
    pluginVue.configs['flat/essential'],
    tseslint.configs.recommended.map(withVueFiles),
    // Remet le parser Vue après typescript-eslint (qui l'écrase sinon)
    pluginVue.configs['flat/base'],
    {
        name: 'app/vue-typescript',
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                // <script lang="ts"> → parser TS, <script> / <script lang="js"> → espree
                parser: { js: 'espree', jsx: 'espree', ts: tseslint.parser, tsx: tseslint.parser },
                ecmaVersion: 2024,
                ecmaFeatures: { jsx: false },
                extraFileExtensions: ['.vue']
            }
        },
        rules: {
            'vue/block-lang': ['error', { script: { lang: ['ts', 'js'], allowNoLang: true } }]
        }
    },
    prettierConfig,
    {
        rules: {
            'comma-dangle': 'off',
            '@typescript-eslint/comma-dangle': 'off',
            // Pages / chrome front (Error, Header, Footer…) — noms intentionnels
            'vue/multi-word-component-names': 'off'
        }
    }
);
