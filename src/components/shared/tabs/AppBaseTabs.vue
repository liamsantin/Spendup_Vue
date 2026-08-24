<script setup lang="ts">
/**
 * Onglets partagés Spend.Up — presets Vuetify + mode pilled (indicateur, overflow, flèches custom).
 */
defineOptions({ name: 'AppBaseTabs' });

import { computed, ref, watch, type Component } from 'vue';
import { useAppBaseTabsOverflow } from '@/components/shared/tabs/useAppBaseTabsOverflow';

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
    /** Compteur / chip a droite du label (ex. invitations). */
    chip?: string | number;
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
        /**
         * Vuetify: `false` does NOT disable arrows (falls back to desktop overflow).
         * Use `'never'` to disable. In pilled mode Vuetify arrows are always off;
         * custom scroll arrows are used instead when tabs overflow.
         */
        showArrows?: boolean | 'always' | 'desktop' | 'mobile' | 'never';
        stacked?: boolean;
        centerActive?: boolean;
        centered?: boolean;
        nextIcon?: string;
        prevIcon?: string;
    }>(),
    {
        modelValue: null,
        preset: 'basic',
        pilled: true,
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
    if (isPilled.value) return false;
    return layoutPreset.value === 'basic' || layoutPreset.value === 'icon' || layoutPreset.value === 'disabled';
});

/** Never use Vuetify affix arrows in pilled mode (they crush tab labels). */
const resolvedShowArrows = computed(() => {
    if (isPilled.value || props.grow) return 'never';
    if (props.showArrows === false) return 'never';
    if (props.showArrows != null) return props.showArrows;
    return layoutPreset.value === 'custom-icons' ? true : 'never';
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
    if (resolvedStacked.value) return 'mb-1';
    if (isPilled.value) return undefined;
    return 'v-icon--start';
}

function hasChip(item: AppBaseTabsItem) {
    return item.chip != null && item.chip !== '' && Number(item.chip) !== 0;
}

const trackAlignClass = computed(() => {
    if (!isPilled.value) return undefined;
    if (resolvedAlignTabs.value === 'center') return 'app-base-tabs__track--center';
    if (resolvedAlignTabs.value === 'end') return 'app-base-tabs__track--end';
    return undefined;
});

const {
    trackRef,
    rootRef,
    pillVisible,
    pillAnimate,
    pillStyle,
    isOverflowing,
    canScrollPrev,
    canScrollNext,
    scrollTabs,
    onTrackScroll
} = useAppBaseTabsOverflow({
    isPilled,
    grow: () => props.grow,
    tabs: () => props.tabs,
    currentValue
});
</script>

<template>
    <v-sheet ref="rootRef" elevation="0" class="app-base-tabs" :class="{ 'app-base-tabs--pilled': isPilled }">
        <div
            v-if="isPilled"
            class="app-base-tabs__nav"
            :class="{
                'app-base-tabs__nav--overflow': isOverflowing && !props.grow,
                'app-base-tabs__nav--center': resolvedAlignTabs === 'center',
                'app-base-tabs__nav--end': resolvedAlignTabs === 'end'
            }"
        >
            <button
                v-show="isOverflowing && !props.grow"
                type="button"
                class="app-base-tabs__arrow app-base-tabs__arrow--prev"
                :disabled="!canScrollPrev"
                aria-label="Previous tabs"
                @click="scrollTabs(-1)"
            >
                <svg class="app-base-tabs__arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>

            <div
                ref="trackRef"
                class="app-base-tabs__track"
                :class="[
                    {
                        'app-base-tabs__track--grow': props.grow,
                        'app-base-tabs__track--scrollable': isOverflowing && !props.grow
                    },
                    trackAlignClass
                ]"
                @scroll.passive="onTrackScroll"
            >
                <div
                    class="app-base-tabs__pill"
                    :class="{
                        'app-base-tabs__pill--visible': pillVisible,
                        'app-base-tabs__pill--animate': pillAnimate
                    }"
                    :style="pillStyle"
                    aria-hidden="true"
                />

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
                    density="comfortable"
                    selected-class="app-base-tabs__tab--active"
                >
                    <v-tab
                        v-for="item in props.tabs"
                        :key="item.value"
                        class="app-base-tabs__tab"
                        :value="item.value"
                        :disabled="item.disabled"
                        :color="item.color"
                        :ripple="false"
                    >
                        <component
                            :is="item.icon"
                            v-if="item.icon"
                            class="app-base-tabs__icon"
                            stroke-width="1.5"
                            width="18"
                            height="18"
                            :class="iconClass(item)"
                        />
                        <span v-if="item.label" class="app-base-tabs__label" :data-label="item.label">{{ item.label }}</span>
                        <v-chip v-if="hasChip(item)" class="app-base-tabs__chip" size="x-small" variant="tonal">
                            {{ item.chip }}
                        </v-chip>
                    </v-tab>
                </v-tabs>
            </div>

            <button
                v-show="isOverflowing && !props.grow"
                type="button"
                class="app-base-tabs__arrow app-base-tabs__arrow--next"
                :disabled="!canScrollNext"
                aria-label="Next tabs"
                @click="scrollTabs(1)"
            >
                <svg class="app-base-tabs__arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
        </div>

        <template v-else>
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
            >
                <v-tab
                    v-for="item in props.tabs"
                    :key="item.value"
                    class="app-base-tabs__tab"
                    :value="item.value"
                    :disabled="item.disabled"
                    :color="item.color"
                >
                    <component
                        :is="item.icon"
                        v-if="item.icon"
                        class="app-base-tabs__icon"
                        stroke-width="1.5"
                        width="18"
                        height="18"
                        :class="iconClass(item)"
                    />
                    <span v-if="item.label" class="app-base-tabs__label">{{ item.label }}</span>
                    <v-chip v-if="hasChip(item)" class="app-base-tabs__chip" color="primary" size="x-small" variant="flat">
                        {{ item.chip }}
                    </v-chip>
                </v-tab>
            </v-tabs>
        </template>

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
