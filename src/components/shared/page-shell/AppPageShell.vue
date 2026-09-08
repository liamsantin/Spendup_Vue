<script setup lang="ts">
/**
 * Shell de page liste — titre + onglets de vue, barre d’outils optionnelle, corps scrollable.
 * `#tabs` : famille d’objets (à droite du titre).
 * `#toolbar` : recherche / filtre / ajouter (ligne sous le sous-titre).
 * `#actions` : actions du hero (inbox, enregistrer) — pas Filtre/Ajouter des listes.
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
            <div v-if="$slots.toolbar" class="su-toolbar">
                <slot name="toolbar" />
            </div>
        </header>

        <div class="su-body">
            <slot />
        </div>
    </div>
</template>
<style scoped>
.su-hero__top--with-tabs > .su-hero__actions {
    margin-left: auto;
}

.su-hero__top--with-tabs:has(.su-hero__actions) :deep(.su-tabs) {
    margin-left: 0;
}
</style>
