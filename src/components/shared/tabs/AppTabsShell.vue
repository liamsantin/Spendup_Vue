<script setup lang="ts">
/**
 * Shell de page à onglets — card + AppBaseTabs (style segmented) + scroll + actions.
 */
defineOptions({ name: 'AppTabsShell' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { FriendLiveChips } from '@/features/notifications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import AppBaseTabs, { type AppBaseTabsItem } from './AppBaseTabs.vue';

export type ShellTab = {
    value: string;
    label: string;
    /** Composant icône vue-tabler (optionnel). */
    icon?: unknown;
    /** Compteur / chip affiché à droite du label (ex. demandes reçues). */
    chip?: string | number;
};

const props = withDefaults(
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
        /**
         * Mode modal / embarqué : pas de FriendLiveChips, card plate,
         * contenu sans scroll forcé plein écran.
         */
        embedded?: boolean;
        /** Style onglets « pill » (indicateur animé). Activé par défaut. */
        pilled?: boolean;
    }>(),
    {
        saveDisabled: true,
        cancelDisabled: true,
        saveLoading: false,
        hideActions: false,
        alignTabs: 'start',
        embedded: false,
        pilled: true
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
    save: [];
    cancel: [];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();

const currentTab = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
});

const baseTabs = computed<AppBaseTabsItem[]>(() =>
    props.tabs.map((tab) => ({
        value: tab.value,
        label: tab.label,
        icon: tab.icon as AppBaseTabsItem['icon'],
        chip: tab.chip
    }))
);

/** Mobile : barre pleine largeur ; desktop : pilule qui épouse le contenu. */
const tabsGrow = computed(() => smAndDown.value);
</script>

<template>
    <div class="settings-page" :class="{ 'settings-page--embedded': props.embedded }">
        <v-card
            :elevation="props.embedded ? 0 : 10"
            :rounded="props.embedded ? 0 : 'md'"
            class="settings-page-card"
            :class="{ 'settings-page-card--embedded': props.embedded }"
        >
            <FriendLiveChips v-if="!props.embedded" />

            <div class="settings-tabs-header flex-grow-0">
                <AppBaseTabs
                    v-model="currentTab"
                    :tabs="baseTabs"
                    :align-tabs="alignTabs"
                    :pilled="pilled"
                    :grow="tabsGrow"
                    :show-panels="false"
                    :show-arrows="false"
                    :show-divider="false"
                />
            </div>

            <v-divider v-if="!props.pilled" class="flex-grow-0" />

            <div v-if="$slots.toolbar" class="settings-tabs-toolbar flex-grow-0">
                <slot name="toolbar" />
            </div>

            <perfect-scrollbar v-if="!props.embedded" class="settings-tabs-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-card-text class="pa-sm-6 pa-3">
                    <slot />
                </v-card-text>
            </perfect-scrollbar>

            <v-card-text v-else class="pa-sm-6 pa-3 settings-tabs-body--embedded">
                <slot />
            </v-card-text>

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

.settings-page--embedded {
    flex: 0 0 auto;
    min-height: unset;
}

.settings-page-card {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.settings-page-card--embedded {
    flex: 0 0 auto;
    min-height: unset;
    background: transparent !important;
}

.settings-tabs-header {
    display: flex;
    justify-content: center;
    padding: 12px 16px 8px;
    max-width: 100%;
}

@media screen and (max-width: 767px) {
    .settings-page:not(.settings-page--embedded) {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page:not(.settings-page--embedded) .settings-page-card {
        border-radius: 0 !important;
    }

    .settings-tabs-header {
        padding: 10px 12px 6px;
    }

    .settings-tabs-toolbar {
        padding: 12px 16px 4px;
    }
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.settings-tabs-body--embedded {
    flex: 0 0 auto;
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
