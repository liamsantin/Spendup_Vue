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
    | 'colors'
    | 'pilled';

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
        pilled?: boolean;
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
        pilled: false,
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

const isPilled = computed(() => props.pilled || props.preset === 'pilled');

const layoutPreset = computed(() => (props.preset === 'pilled' ? 'basic' : props.preset));

const resolvedBgColor = computed(() => {
    if (props.bgColor) return props.bgColor;
    if (isPilled.value) return undefined;
    if (['basic', 'stacked', 'center-active', 'custom-icons'].includes(layoutPreset.value)) return 'primary';
    return undefined;
});

const resolvedColor = computed(() => {
    if (props.color) return props.color;
    if (isPilled.value) return undefined;
    if (['icon', 'disabled', 'align-center', 'align-end'].includes(layoutPreset.value)) return 'primary';
    return undefined;
});

const resolvedAlignTabs = computed(() => {
    if (props.alignTabs) return props.alignTabs;
    if (layoutPreset.value === 'align-center') return 'center';
    if (layoutPreset.value === 'align-end') return 'end';
    return undefined;
});

const resolvedShowPanels = computed(() => {
    if (props.showPanels != null) return props.showPanels;
    return layoutPreset.value !== 'center-active' && layoutPreset.value !== 'custom-icons';
});

const resolvedShowDivider = computed(() => {
    if (props.showDivider != null) return props.showDivider;
    if (isPilled.value) return true;
    return layoutPreset.value === 'basic' || layoutPreset.value === 'icon' || layoutPreset.value === 'disabled';
});

const resolvedShowArrows = computed(() => {
    if (props.showArrows != null) return props.showArrows;
    return layoutPreset.value === 'custom-icons';
});

const resolvedStacked = computed(() => {
    if (props.stacked != null) return props.stacked;
    return layoutPreset.value === 'stacked';
});

const resolvedCentered = computed(() => {
    if (props.centered != null) return props.centered;
    return layoutPreset.value === 'stacked';
});

const resolvedCenterActive = computed(() => {
    if (props.centerActive != null) return props.centerActive;
    return layoutPreset.value === 'center-active';
});

const resolvedPanelClass = computed(() => {
    if (props.panelClass) return props.panelClass;
    return layoutPreset.value === 'align-center' || layoutPreset.value === 'align-end' ? 'rounded-md pa-0 mt-6' : '';
});

const resolvedContentClass = computed(() => {
    if (props.contentClass) return props.contentClass;
    return layoutPreset.value === 'align-center' || layoutPreset.value === 'align-end' ? '' : 'bg-grey100 mt-4 rounded-md';
});

function iconClass(item: AppBaseTabsItem) {
    if (!item.label) return undefined;
    return resolvedStacked.value ? 'mb-1' : 'v-icon--start';
}
</script>

<template>
    <v-sheet elevation="0" class="app-base-tabs" :class="{ 'app-base-tabs--pilled': isPilled }">
        <v-tabs
            v-model="currentValue"
            class="app-base-tabs__list"
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
            :density="isPilled ? 'comfortable' : undefined"
            :selected-class="isPilled ? 'app-base-tabs__tab--active' : undefined"
        >
            <v-tab
                v-for="item in props.tabs"
                :key="item.value"
                class="app-base-tabs__tab"
                :value="item.value"
                :disabled="item.disabled"
                :color="item.color"
            >
                <component :is="item.icon" v-if="item.icon" stroke-width="1.5" width="20" :class="iconClass(item)" />
                <span v-if="item.label">{{ item.label }}</span>
            </v-tab>
        </v-tabs>

        <v-divider v-if="resolvedShowDivider" class="app-base-tabs__divider" />

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

<style scoped lang="scss">
.app-base-tabs--pilled {
    background: transparent;

    .app-base-tabs__list {
        :deep(.v-slide-group__content) {
            gap: 4px;
            padding-bottom: 8px;
        }

        :deep(.v-tab) {
            min-width: auto;
            height: auto;
            min-height: 36px;
            padding: 8px 12px;
            border-radius: 6px;
            letter-spacing: normal;
            text-transform: none;
            font-size: 0.875rem;
            font-weight: 500;
            color: rgba(var(--v-theme-textPrimary), 0.55);
            opacity: 1;
            transition:
                background-color 0.15s ease,
                color 0.15s ease;

            .v-btn__overlay,
            .v-btn__underlay {
                display: none;
            }

            .v-tab__slider {
                display: none;
            }

            &:hover:not(.v-tab--selected):not(.v-tab--disabled) {
                color: rgb(var(--v-theme-primary));
                background-color: rgb(var(--v-theme-lightprimary));
            }

            &.v-tab--disabled {
                opacity: 0.4;
            }
        }

        :deep(.app-base-tabs__tab--active),
        :deep(.v-tab--selected) {
            font-weight: 700;
            color: rgb(var(--v-theme-primary)) !important;
            background-color: rgb(var(--v-theme-lightprimary));
        }
    }

    .app-base-tabs__divider {
        border-color: rgb(var(--v-theme-borderColor));
        opacity: 1;
    }
}
</style>
