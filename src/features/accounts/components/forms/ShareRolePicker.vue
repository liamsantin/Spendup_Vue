<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { EyeIcon, PencilIcon } from 'vue-tabler-icons';
import type { ShareRole } from '@/features/accounts/types';

withDefaults(
    defineProps<{
        disabled?: boolean;
    }>(),
    { disabled: false }
);

const model = defineModel<ShareRole>({ required: true });
const { t } = useI18n();

const options: { value: ShareRole; icon: typeof EyeIcon; hintKey: string }[] = [
    { value: 'viewer', icon: EyeIcon, hintKey: 'comptesPage.share.roleHints.viewer' },
    { value: 'editor', icon: PencilIcon, hintKey: 'comptesPage.share.roleHints.editor' }
];
</script>

<template>
    <div class="share-role-picker" role="radiogroup" :aria-label="t('comptesPage.share.fields.role')">
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            role="radio"
            class="share-role-picker__option"
            :class="{ 'share-role-picker__option--active': model === option.value }"
            :aria-checked="model === option.value"
            :disabled="disabled"
            @click="model = option.value"
        >
            <span class="share-role-picker__icon su-tile su-tile--blue" aria-hidden="true">
                <component :is="option.icon" :size="18" stroke-width="1.6" />
            </span>
            <span class="share-role-picker__copy">
                <span class="share-role-picker__title">{{ t(`comptesPage.roles.${option.value}`) }}</span>
                <span class="share-role-picker__hint">{{ t(option.hintKey) }}</span>
            </span>
        </button>
    </div>
</template>

<style scoped>
/* Deux blocs carrés : bordure fine, sélection = bordure noire (pas de fond coloré). */
.share-role-picker {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

@media (max-width: 359.98px) {
    .share-role-picker {
        grid-template-columns: 1fr;
    }
}

.share-role-picker__option {
    appearance: none;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    text-align: left;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 0;
    font: inherit;
    cursor: pointer;
    transition:
        border-color 0.15s var(--ease),
        background 0.15s var(--ease);
}

.share-role-picker__option:hover:not(:disabled) {
    background: var(--soft);
}

.share-role-picker__option--active {
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
}

.share-role-picker__option:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.share-role-picker__option:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.share-role-picker__icon {
    flex: none;
}

.share-role-picker__copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
}

.share-role-picker__title {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
}

.share-role-picker__hint {
    color: var(--gray);
    font-size: 13px;
    line-height: 1.35;
}
</style>
