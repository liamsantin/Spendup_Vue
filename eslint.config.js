import pluginVue from 'eslint-plugin-vue';
import { configureVueProject, defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

configureVueProject({
    scriptLangs: ['ts', 'js'],
    rootDir: import.meta.dirname
});

export default defineConfigWithVueTs(
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/.vs/**', '**/_template/**']
    },
    pluginVue.configs['flat/essential'],
    vueTsConfigs.recommended,
    {
        rules: {
            'comma-dangle': 'off',
            '@typescript-eslint/comma-dangle': 'off',
            'vue/multi-word-component-names': 'off'
        }
    },
    prettierConfig
);
