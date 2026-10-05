<script setup lang="ts">
/**
 * Modale de confirmation compacte — header + footer uniquement (pas de section body).
 * Même langage visuel qu’`AppModalBase` (titre, texte, boutons, close).
 */
defineOptions({ name: 'AppConfirmationModal' });

import { computed } from 'vue';
import { XIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        /** Message de confirmation sous le titre (style secondaire léger). */
        message?: string;
        maxWidth?: number | string;
        persistent?: boolean;
        confirmLabel?: string;
        cancelLabel?: string;
        confirmColor?: string;
        /** Classes CSS optionnelles sur le bouton de confirmation (ex. `bg-lighterror text-error`). */
        confirmClass?: string;
        loading?: boolean;
        disabled?: boolean;
    }>(),
    {
        message: undefined,
        maxWidth: 440,
        persistent: true,
        confirmLabel: undefined,
        cancelLabel: undefined,
        confirmColor: 'primary',
        confirmClass: undefined,
        loading: false,
        disabled: false
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirm: [];
}>();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const resolvedCancelLabel = computed(() => props.cancelLabel ?? t('common.cancel'));
const resolvedConfirmLabel = computed(() => props.confirmLabel ?? t('common.yes'));

const confirmBtnClass = computed(() => {
    const extras = props.confirmClass ? ` ${props.confirmClass}` : '';
    if (props.confirmColor === 'error' || props.confirmClass?.includes('error')) return `su-btn su-btn--danger${extras}`;
    if (props.confirmColor === 'warning') return `su-btn su-btn--warn${extras}`;
    return `su-btn su-btn--ink${extras}`;
});

function close() {
    open.value = false;
}

function onConfirm() {
    if (props.loading || props.disabled) return;
    emit('confirm');
}

defineExpose({ close });
</script>

<template>
    <v-dialog v-model="open" :max-width="maxWidth" :persistent="persistent" transition="fade-transition">
        <v-card rounded="md" class="app-confirmation-modal su-modal">
            <div class="app-confirmation-modal__header">
                <div class="pr-12">
                    <h5 class="text-h5">{{ title }}</h5>
                    <p v-if="message" class="text-subtitle-1 text-medium-emphasis mt-1 mb-0">{{ message }}</p>
                    <slot name="header-extra" />
                </div>
                <button
                    type="button"
                    class="su-orb app-confirmation-modal__close"
                    :aria-label="t('common.close')"
                    :disabled="loading"
                    @click="close"
                >
                    <XIcon :size="18" stroke-width="1.5" />
                </button>
            </div>

            <v-divider class="flex-grow-0" />

            <div class="app-confirmation-modal__footer">
                <slot name="footer" :close="close" :confirm="onConfirm">
                    <button type="button" class="su-btn su-btn--ghost" :disabled="loading || disabled" @click="close">
                        {{ resolvedCancelLabel }}
                    </button>
                    <button
                        type="button"
                        :class="confirmBtnClass"
                        :disabled="loading || disabled"
                        :aria-busy="loading || undefined"
                        @click="onConfirm"
                    >
                        <span v-if="loading" class="su-spin" aria-hidden="true" />
                        {{ resolvedConfirmLabel }}
                    </button>
                </slot>
            </div>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.app-confirmation-modal {
    display: flex !important;
    flex-direction: column;
    overflow: hidden;
    height: auto !important;
    max-height: 85vh;
}

.app-confirmation-modal__header {
    position: relative;
    flex-shrink: 0;
    padding: 20px 24px;
}

.app-confirmation-modal__close {
    position: absolute;
    top: 12px;
    right: 12px;
}

.app-confirmation-modal__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
}
</style>
