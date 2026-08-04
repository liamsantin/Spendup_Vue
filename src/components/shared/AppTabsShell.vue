<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { FriendLiveChips } from '@/features/notifications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { t } = useI18n();

export type ShellTab = {
    value: string;
    label: string;
    /** Composant icône vue-tabler (optionnel). */
    icon?: unknown;
    /** Compteur / chip affiché à droite du label (ex. demandes reçues). */
    chip?: string | number;
};

withDefaults(
    defineProps<{
        tabs: ShellTab[];
        modelValue: string;
        saveDisabled?: boolean;
        cancelDisabled?: boolean;
        saveLoading?: boolean;
        /** Masquer la barre d’actions (onglets sans save). */
        hideActions?: boolean;
        /** Alignement des onglets (`v-tabs` align-tabs). */
        alignTabs?: 'start' | 'title' | 'center' | 'end';
    }>(),
    {
        saveDisabled: true,
        cancelDisabled: true,
        saveLoading: false,
        hideActions: false,
        alignTabs: 'start'
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
    save: [];
    cancel: [];
}>();
</script>

<template>
    <div class="settings-page">
        <v-card elevation="10" rounded="md" class="settings-page-card">
            <FriendLiveChips />

            <v-tabs
                :model-value="modelValue"
                bg-color="grey100"
                density="comfortable"
                height="52"
                color="primary"
                :align-tabs="alignTabs"
                show-arrows
                class="settings-tabs flex-grow-0"
                @update:model-value="emit('update:modelValue', String($event))"
            >
                <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value" class="text-medium-emphasis">
                    <component :is="tab.icon" v-if="tab.icon" class="mr-2" size="18" />
                    {{ tab.label }}
                    <v-chip
                        v-if="tab.chip != null && tab.chip !== '' && Number(tab.chip) !== 0"
                        class="ml-2"
                        color="primary"
                        size="x-small"
                        variant="flat"
                    >
                        {{ tab.chip }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <v-divider class="flex-grow-0" />

            <div v-if="$slots.toolbar" class="settings-tabs-toolbar flex-grow-0">
                <slot name="toolbar" />
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
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

@media screen and (max-width: 767px) {
    .settings-page {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page-card {
        border-radius: 0 !important;
    }

    .settings-tabs-toolbar {
        padding: 12px 16px 4px;
    }
}

.settings-tabs :deep(.v-tab) {
    min-height: 52px;
    font-size: 0.875rem;
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.settings-tabs-toolbar {
    flex-shrink: 0;
    padding: 12px 24px 4px;
    background: rgb(var(--v-theme-surface));
}

.settings-actions-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: rgb(var(--v-theme-surface));
}
</style>
