<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { EyeIcon, PencilIcon } from 'vue-tabler-icons';
import type { ShareRole } from '../../types';

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
    <div class="share-role-picker">
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="share-role-picker__option"
            :class="{ 'share-role-picker__option--active': model === option.value }"
            :disabled="disabled"
            @click="model = option.value"
        >
            <span class="share-role-picker__icon" aria-hidden="true">
                <component :is="option.icon" :size="22" stroke-width="1.5" />
            </span>
            <span class="share-role-picker__copy">
                <span class="share-role-picker__title">{{ t(`comptesPage.roles.${option.value}`) }}</span>
                <span class="share-role-picker__hint">{{ t(option.hintKey) }}</span>
            </span>
        </button>
    </div>
</template>

<style scoped>
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
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    text-align: left;
    color: rgb(var(--v-theme-on-surface));
    background: transparent;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
    cursor: pointer;
    transition:
        border-color 160ms ease,
        background-color 160ms ease,
        box-shadow 160ms ease;
}

.share-role-picker__option:hover:not(:disabled) {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
}

.share-role-picker__option--active {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.08);
    box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.share-role-picker__option:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.share-role-picker__icon {
    display: grid;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    place-items: center;
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 8px;
}

.share-role-picker__copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
}

.share-role-picker__title {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
}

.share-role-picker__hint {
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-size: 0.75rem;
    line-height: 1.35;
}
</style>
