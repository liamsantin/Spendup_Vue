<script setup lang="ts">
/**
 * Shell de page simple — hero verre (titre + onglets optionnels + actions, sous-titre dessous) + corps.
 * Même alignement vertical du bloc de droite que AppTabsShell.
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

withDefaults(
    defineProps<{
        title: string;
        subtitle?: string;
        /** Conservé pour compatibilité des pages existantes (non affiché). */
        icon?: unknown;
        /** Masquer Enregistrer / Annuler (défaut : masqués). */
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
            <div class="su-hero__top" :class="{ 'su-hero__top--with-tabs': $slots.tabs }">
                <div class="su-hero__heading">
                    <h1>{{ title }}</h1>
                </div>
                <div v-if="$slots.actions || !hideActions" class="su-hero__actions">
                    <slot name="actions" />
                    <template v-if="!hideActions">
                        <button type="button" class="su-btn su-btn--ghost" :disabled="cancelDisabled" @click="emit('cancel')">
                            {{ t('shell.cancel') }}
                        </button>
                        <button type="button" class="su-btn su-btn--ink" :disabled="saveDisabled || saveLoading" @click="emit('save')">
                            {{ t('shell.save') }}
                        </button>
                    </template>
                </div>
                <slot name="tabs" />
            </div>
            <p v-if="subtitle">{{ subtitle }}</p>
        </header>

        <div class="su-body">
            <slot />
        </div>
    </div>
</template>
<style scoped>
/* Tabs à droite des actions : le bloc actions absorbe l’espace, pas les onglets. */
.su-hero__top--with-tabs > .su-hero__actions {
    margin-left: auto;
}

.su-hero__top--with-tabs :deep(.su-tabs) {
    margin-left: 0;
}
</style>

