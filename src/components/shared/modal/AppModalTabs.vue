<script setup lang="ts">
/**
 * Shell modal à onglets — AppModalBase + AppBaseTabs.
 * Tabs hors scroll (toolbar) ; chaque panel scrolle dans le body.
 */
defineOptions({ name: 'AppModalTabs' });

import { computed, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import AppBaseTabs, { type AppBaseTabsItem, type AppBaseTabsPreset } from '../tabs/AppBaseTabs.vue';
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
        scrollable?: boolean;
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
        scrollable: true,
        preset: 'align-center',
        color: undefined,
        bgColor: undefined,
        alignTabs: 'start',
        grow: false,
        pilled: true,
        mobileLayout: 'fullscreen'
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'update:tab': [value: string];
}>();

const { smAndDown } = useDisplay();
const tabsGrow = computed(() => props.grow || smAndDown.value);

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
        :persistent="persistent"
        :show-footer="showFooter"
        :scrollable="scrollable"
        :mobile-layout="mobileLayout"
    >
        <template v-if="$slots['header-extra']" #header-extra>
            <slot name="header-extra" />
        </template>

        <template #toolbar>
            <AppBaseTabs
                v-model="currentTab"
                :tabs="tabs"
                :preset="preset"
                :color="color"
                :bg-color="bgColor"
                :align-tabs="alignTabs"
                :grow="tabsGrow"
                :pilled="pilled"
                :show-panels="false"
            />
        </template>

        <slot :active-tab="currentTab" />

        <v-window v-model="currentTab" class="app-modal-tabs__window">
            <v-window-item v-for="item in tabs" :key="item.value" :value="item.value" class="app-modal-tabs__item">
                <slot :name="`panel-${item.value}`" :tab="item" :active-tab="currentTab" />
            </v-window-item>
        </v-window>

        <template v-if="$slots.footer" #footer="{ close }">
            <slot name="footer" :close="close" />
        </template>
    </AppModalBase>
</template>

<style scoped>
.app-modal-tabs__window,
.app-modal-tabs__item {
    min-height: 520px;
}

@media (max-width: 599.98px) {
    .app-modal-tabs__window,
    .app-modal-tabs__item {
        min-height: 0;
    }
}
</style>
