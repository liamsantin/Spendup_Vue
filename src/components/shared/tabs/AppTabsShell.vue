<script setup lang="ts">
/**
 * Shell de page à onglets — hero verre + onglets pill + corps scrollable.
 */
defineOptions({ name: 'AppTabsShell' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FriendLiveChips } from '@/features/notifications';

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
        title?: string;
        subtitle?: string;
        saveDisabled?: boolean;
        cancelDisabled?: boolean;
        saveLoading?: boolean;
        /** Masquer la barre d’actions (onglets sans save). */
        hideActions?: boolean;
        /** Alignement des onglets — conservé pour compatibilité. */
        alignTabs?: 'start' | 'title' | 'center' | 'end';
        /**
         * Mode modal / embarqué : pas de FriendLiveChips,
         * contenu sans scroll forcé plein écran.
         */
        embedded?: boolean;
        /** Conservé pour compatibilité (les onglets verre sont toujours pill). */
        pilled?: boolean;
    }>(),
    {
        title: undefined,
        subtitle: undefined,
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

const currentTab = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
});

function selectTab(value: string) {
    currentTab.value = value;
}
</script>

<template>
    <div class="su-page" :class="{ 'su-page--embedded': props.embedded }">
        <header class="su-hero">
            <div class="su-hero__top">
                <div class="su-hero__heading">
                    <h1 v-if="title">{{ title }}</h1>
                    <p v-if="subtitle">{{ subtitle }}</p>
                </div>
                <nav class="su-tabs" :aria-label="title">
                    <button
                        v-for="item in tabs"
                        :key="item.value"
                        type="button"
                        class="su-tab"
                        :class="{ 'is-active': currentTab === item.value }"
                        :aria-current="currentTab === item.value ? 'page' : undefined"
                        @click="selectTab(item.value)"
                    >
                        <component :is="item.icon" v-if="item.icon" :size="18" stroke-width="1.6" />
                        {{ item.label }}
                        <span v-if="item.chip" class="su-tab__chip">{{ item.chip }}</span>
                    </button>
                </nav>
                <div v-if="!hideActions" class="su-hero__actions">
                    <button type="button" class="su-btn su-btn--ghost" :disabled="cancelDisabled" @click="emit('cancel')">
                        {{ t('shell.cancel') }}
                    </button>
                    <button type="button" class="su-btn su-btn--ink" :disabled="saveDisabled || saveLoading" @click="emit('save')">
                        {{ t('shell.save') }}
                    </button>
                </div>
            </div>
            <div v-if="$slots.toolbar" class="su-toolbar">
                <slot name="toolbar" />
            </div>
        </header>

        <FriendLiveChips v-if="!props.embedded" />

        <div class="su-body">
            <slot />
        </div>
    </div>
</template>
