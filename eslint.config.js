import pluginVue from 'eslint-plugin-vue';
import { configureVueProject, defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

configureVueProject({ scriptLangs: ['ts', 'js'] });

export default defineConfigWithVueTs(
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mjs,js,vue}']
    },
    {
        name: 'app/files-to-ignore',
        ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**']
    },
    pluginVue.configs['flat/essential'],
    vueTsConfigs.recommended,
    prettierConfig,
    {
        rules: {
            'comma-dangle': 'off',
            '@typescript-eslint/comma-dangle': 'off'
        }
    }
);
