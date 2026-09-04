<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

withDefaults(
    defineProps<{
        title: string;
        subtitle?: string;
        /** Conservé pour compatibilité des pages existantes (non affiché). */
        icon?: unknown;
        /** Masquer la barre d’actions bas (défaut : masquée). */
        hideActions?: boolean;
        saveDisabled?: boolean;
        cancelDisabled?: boolean;
        saveLoading?: boolean;
    }>(),
    {
        subtitle: undefined,
        icon: undefined,
        hideActions: true,
        saveDisabled: true,
        cancelDisabled: true,
        saveLoading: false
    }
);

const emit = defineEmits<{
    save: [];
    cancel: [];
}>();
</script>

<template>
    <div class="su-page">
        <header class="su-hero">
            <div class="su-hero__top">
                <h1>{{ title }}</h1>
                <div v-if="$slots.actions" class="su-hero__actions">
                    <slot name="actions" />
                </div>
            </div>
            <p v-if="subtitle">{{ subtitle }}</p>
        </header>

        <div class="su-body">
            <slot />
        </div>

        <footer v-if="!hideActions" class="su-footer">
            <button type="button" class="su-btn su-btn--ink" :disabled="saveDisabled || saveLoading" @click="emit('save')">
                {{ t('shell.save') }}
            </button>
            <button type="button" class="su-btn su-btn--danger" :disabled="cancelDisabled" @click="emit('cancel')">
                {{ t('shell.cancel') }}
            </button>
        </footer>
    </div>
</template>
