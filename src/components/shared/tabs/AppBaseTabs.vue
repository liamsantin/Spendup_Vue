<script setup lang="ts">
defineOptions({ name: 'AppBaseTabs' });

import { computed, ref, watch, type Component } from 'vue';

export type AppBaseTabsPreset =
    | 'basic'
    | 'stacked'
    | 'center-active'
    | 'custom-icons'
    | 'align-center'
    | 'align-end'
    | 'icon'
    | 'disabled'
    | 'colors';

export type AppBaseTabsItem = {
    value: string;
    label?: string;
    icon?: Component;
    disabled?: boolean;
    color?: string;
};

const props = withDefaults(
    defineProps<{
        modelValue?: string | null;
        tabs: AppBaseTabsItem[];
        preset?: AppBaseTabsPreset;
        color?: string;
        bgColor?: string;
        alignTabs?: 'start' | 'title' | 'center' | 'end';
        grow?: boolean;
        showPanels?: boolean;
        panelClass?: string;
        contentClass?: string;
        showDivider?: boolean;
        showArrows?: boolean;
        stacked?: boolean;
        centerActive?: boolean;
        centered?: boolean;
        nextIcon?: string;
        prevIcon?: string;
    }>(),
    {
        modelValue: null,
        preset: 'basic',
        color: undefined,
        bgColor: undefined,
        alignTabs: undefined,
        grow: false,
        showPanels: undefined,
        panelClass: undefined,
        contentClass: undefined,
        showDivider: undefined,
        showArrows: undefined,
        stacked: undefined,
        centerActive: undefined,
        centered: undefined,
        nextIcon: undefined,
        prevIcon: undefined
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const internalValue = ref<string>(props.tabs.find((item) => !item.disabled)?.value ?? props.tabs[0]?.value ?? '');

watch(
    () => props.modelValue,
    (value) => {
        if (value != null) internalValue.value = value;
    },
    { immediate: true }
);

watch(
    () => props.tabs,
    (tabs) => {
        if (!tabs.some((item) => item.value === internalValue.value && !item.disabled)) {
            internalValue.value = tabs.find((item) => !item.disabled)?.value ?? tabs[0]?.value ?? '';
        }
    },
    { deep: true }
);

const currentValue = computed({
    get: () => (props.modelValue != null ? props.modelValue : internalValue.value),
    set: (value: string) => {
        internalValue.value = value;
        emit('update:modelValue', value);
    }
});

const resolvedBgColor = computed(() => {
    if (props.bgColor) return props.bgColor;
    if (['basic', 'stacked', 'center-active', 'custom-icons'].includes(props.preset)) return 'primary';
    return undefined;
});

const resolvedColor = computed(() => {
    if (props.color) return props.color;
    if (['icon', 'disabled', 'align-center', 'align-end'].includes(props.preset)) return 'primary';
    return undefined;
});

const resolvedAlignTabs = computed(() => {
    if (props.alignTabs) return props.alignTabs;
    if (props.preset === 'align-center') return 'center';
    if (props.preset === 'align-end') return 'end';
    return undefined;
});

const resolvedShowPanels = computed(() => {
    if (props.showPanels != null) return props.showPanels;
    return props.preset !== 'center-active' && props.preset !== 'custom-icons';
});

const resolvedShowDivider = computed(() => {
    if (props.showDivider != null) return props.showDivider;
    return props.preset === 'basic' || props.preset === 'icon' || props.preset === 'disabled';
});

const resolvedShowArrows = computed(() => {
    if (props.showArrows != null) return props.showArrows;
    return props.preset === 'custom-icons';
});

const resolvedStacked = computed(() => {
    if (props.stacked != null) return props.stacked;
    return props.preset === 'stacked';
});

const resolvedCentered = computed(() => {
    if (props.centered != null) return props.centered;
    return props.preset === 'stacked';
});

const resolvedCenterActive = computed(() => {
    if (props.centerActive != null) return props.centerActive;
    return props.preset === 'center-active';
});

const resolvedPanelClass = computed(() => {
    if (props.panelClass) return props.panelClass;
    return props.preset === 'align-center' || props.preset === 'align-end' ? 'rounded-md pa-0 mt-6' : '';
});

const resolvedContentClass = computed(() => {
    if (props.contentClass) return props.contentClass;
    return props.preset === 'align-center' || props.preset === 'align-end' ? '' : 'bg-grey100 mt-4 rounded-md';
});

function iconClass(item: AppBaseTabsItem) {
    if (!item.label) return undefined;
    return resolvedStacked.value ? 'mb-1' : 'v-icon--start';
}
</script>

<template>
    <v-sheet elevation="0">
        <v-tabs
            v-model="currentValue"
            :bg-color="resolvedBgColor"
            :color="resolvedColor"
            :align-tabs="resolvedAlignTabs"
            :grow="props.grow"
            :show-arrows="resolvedShowArrows"
            :stacked="resolvedStacked"
            :centered="resolvedCentered"
            :center-active="resolvedCenterActive"
            :next-icon="props.nextIcon"
            :prev-icon="props.prevIcon"
        >
            <v-tab
                v-for="item in props.tabs"
                :key="item.value"
                :value="item.value"
                :disabled="item.disabled"
                :color="item.color"
            >
                <component :is="item.icon" v-if="item.icon" stroke-width="1.5" width="20" :class="iconClass(item)" />
                <span v-if="item.label">{{ item.label }}</span>
            </v-tab>
        </v-tabs>

        <v-divider v-if="resolvedShowDivider" />

        <v-card-text v-if="resolvedShowPanels" :class="resolvedContentClass">
            <div :class="resolvedPanelClass">
                <v-window v-model="currentValue">
                    <v-window-item v-for="item in props.tabs" :key="item.value" :value="item.value">
                        <slot :name="`panel-${item.value}`" :tab="item" :active-tab="currentValue">
                            {{ item.label || item.value }}
                        </slot>
                    </v-window-item>
                </v-window>
            </div>
        </v-card-text>
    </v-sheet>
</template>
