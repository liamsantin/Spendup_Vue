<script setup lang="ts">
/**
 * Shell modal à onglets — AppModalBase + bandeau d’onglets plat.
 * Tabs hors scroll (toolbar) ; chaque panel scrolle dans le body.
 */
defineOptions({ name: 'AppModalTabs' });

import { computed, ref, watch } from 'vue';
import type { AppBaseTabsItem, AppBaseTabsPreset } from '../tabs/AppBaseTabs.vue';
import AppModalBase from './AppModalBase.vue';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        tab?: string | null;
        tabs: AppBaseTabsItem[];
        title: string;
        subtitle?: string;
        maxWidth?: number | string;
        height?: number | string;
        persistent?: boolean;
        showFooter?: boolean;
        preset?: AppBaseTabsPreset;
        color?: string;
        bgColor?: string;
        alignTabs?: 'start' | 'title' | 'center' | 'end';
        grow?: boolean;
        pilled?: boolean;
        mobileLayout?: 'dialog' | 'fullscreen' | 'sheet';
    }>(),
    {
        tab: null,
        subtitle: undefined,
        maxWidth: 640,
        height: 720,
        persistent: true,
        showFooter: true,
        preset: 'align-center',
        color: undefined,
        bgColor: undefined,
        alignTabs: 'center',
        grow: false,
        pilled: true,
        mobileLayout: 'fullscreen'
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'update:tab': [value: string];
    'after-leave': [];
}>();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const internalTab = ref(props.tabs.find((item) => !item.disabled)?.value ?? props.tabs[0]?.value ?? '');

watch(
    () => props.tab,
    (value) => {
        if (value != null) internalTab.value = value;
    },
    { immediate: true }
);

watch(
    () => props.tabs,
    (tabs) => {
        if (!tabs.some((item) => item.value === internalTab.value && !item.disabled)) {
            internalTab.value = tabs.find((item) => !item.disabled)?.value ?? tabs[0]?.value ?? '';
        }
    },
    { deep: true }
);

const currentTab = computed({
    get: () => (props.tab != null ? props.tab : internalTab.value),
    set: (value: string) => {
        internalTab.value = value;
        emit('update:tab', value);
    }
});
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="title"
        :subtitle="subtitle"
        :max-width="maxWidth"
        :height="height"
        :fixed-height="true"
        :persistent="persistent"
        :show-footer="showFooter"
        :scrollable="false"
        :mobile-layout="mobileLayout"
        @after-leave="emit('after-leave')"
    >
        <template v-if="$slots['header-extra']" #header-extra>
            <slot name="header-extra" />
        </template>

        <template #toolbar>
            <div class="app-modal-tabs__toolbar">
                <nav class="app-modal-tabs__nav" :aria-label="title">
                    <button
                        v-for="item in tabs"
                        :key="item.value"
                        type="button"
                        class="app-modal-tabs__tab"
                        :class="{ 'is-active': currentTab === item.value }"
                        :disabled="item.disabled"
                        :title="item.title"
                        :aria-current="currentTab === item.value ? 'page' : undefined"
                        @click="currentTab = item.value"
                    >
                        <component :is="item.icon" v-if="item.icon" :size="16" stroke-width="1.6" />
                        <span class="app-modal-tabs__label">{{ item.label }}</span>
                        <span v-if="item.chip" class="app-modal-tabs__chip">{{ item.chip }}</span>
                    </button>
                </nav>
            </div>
        </template>

        <div class="app-modal-tabs__body">
            <slot :active-tab="currentTab" />

            <v-window v-model="currentTab" class="app-modal-tabs__window">
                <v-window-item v-for="item in tabs" :key="item.value" :value="item.value" class="app-modal-tabs__item">
                    <slot :name="`panel-${item.value}`" :tab="item" :active-tab="currentTab" />
                </v-window-item>
            </v-window>
        </div>

        <template v-if="$slots.footer" #footer="{ close }">
            <slot name="footer" :close="close" />
        </template>
    </AppModalBase>
</template>

<style scoped>
.app-modal-tabs__toolbar {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 2px 24px 12px;
    box-sizing: border-box;
}

.app-modal-tabs__nav {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    gap: 22px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    box-sizing: border-box;
}

.app-modal-tabs__nav::-webkit-scrollbar {
    display: none;
}

.app-modal-tabs__tab {
    appearance: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 0 0 auto;
    min-width: 0;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    white-space: nowrap;
    cursor: pointer;
    transition:
        color 0.15s var(--ease),
        box-shadow 0.15s var(--ease);
}

.app-modal-tabs__tab:hover:not(:disabled):not(.is-active) {
    color: var(--ink);
}

.app-modal-tabs__tab:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.app-modal-tabs__tab.is-active {
    color: var(--ink);
    font-weight: 700;
    box-shadow: inset 0 -2px 0 var(--ink);
}

.app-modal-tabs__tab:disabled {
    opacity: 0.4;
    cursor: default;
}

.app-modal-tabs__tab svg {
    display: none;
}

.app-modal-tabs__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-modal-tabs__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--blue);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
}

.app-modal-tabs__body {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

.app-modal-tabs__window {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

.app-modal-tabs__window :deep(.v-window__container) {
    flex: 1 1 0;
    height: 100% !important;
    max-height: 100%;
    min-height: 0;
}

.app-modal-tabs__item {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    /* Marge interne : le scale hover des .su-btn / .su-orb peut peindre ici sans coupe. */
    padding: 6px;
    box-sizing: border-box;
}

.app-modal-tabs__item > * {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    /* visible : laisse le hover scale déborder vers le padding du parent ; le scroll reste sur AppModalPanelScroll. */
    overflow: visible;
}
</style>
