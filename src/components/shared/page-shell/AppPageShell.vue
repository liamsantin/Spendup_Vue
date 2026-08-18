<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { t } = useI18n();

withDefaults(
    defineProps<{
        title: string;
        subtitle?: string;
        /** Composant icône vue-tabler (optionnel). */
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
    <div class="settings-page">
        <v-card elevation="10" rounded="md" class="settings-page-card">
            <div class="app-page-shell-header">
                <div class="d-flex align-center ga-3 min-width-0">
                    <v-avatar v-if="icon" class="bg-lightprimary text-primary flex-shrink-0" rounded="md" size="46">
                        <component :is="icon" size="23" />
                    </v-avatar>
                    <div class="min-width-0">
                        <h4 class="text-h5 mb-0">{{ title }}</h4>
                        <div v-if="subtitle" class="text-subtitle-1 textSecondary mt-1 text-truncate">
                            {{ subtitle }}
                        </div>
                    </div>
                </div>
                <div v-if="$slots.actions" class="d-flex align-center ga-2 flex-shrink-0">
                    <slot name="actions" />
                </div>
            </div>

            <perfect-scrollbar class="settings-tabs-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-card-text class="pa-sm-6 pa-3">
                    <slot />
                </v-card-text>
            </perfect-scrollbar>

            <template v-if="!hideActions">
                <v-divider class="flex-grow-0" />
                <div class="settings-actions-bar">
                    <v-btn color="primary" class="mr-3" flat :loading="saveLoading" :disabled="saveDisabled" @click="emit('save')">
                        {{ t('shell.save') }}
                    </v-btn>
                    <v-btn class="bg-lighterror text-error" flat :disabled="cancelDisabled" @click="emit('cancel')">
                        {{ t('shell.cancel') }}
                    </v-btn>
                </div>
            </template>
        </v-card>
    </div>
</template>

<style scoped>
.settings-page {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.settings-page-card {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.app-page-shell-header {
    flex-grow: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    min-height: 72px;
    padding: 14px 24px;
    background: rgb(var(--v-theme-grey100));
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.settings-actions-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: rgb(var(--v-theme-surface));
}

@media screen and (max-width: 767px) {
    .settings-page {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page-card {
        border-radius: 0 !important;
    }

    .app-page-shell-header {
        min-height: 68px;
        padding: 12px 16px;
    }
}
</style>
