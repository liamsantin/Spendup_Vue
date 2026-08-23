<script setup lang="ts">
defineOptions({ name: 'AppBaseTabs' });

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue';

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
    /** Compteur / chip à droite du label (ex. invitations). */
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
    if (resolvedStacked.value) return 'mb-1';
    // En mode pilled, l’espacement icône/label est géré par gap CSS.
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

const trackRef = ref<HTMLElement | null>(null);
const pillVisible = ref(false);
const pillAnimate = ref(false);
const pillStyle = ref<Record<string, string>>({
    width: '0px',
    height: '0px',
    transform: 'translate(0px, 0px)'
});

let resizeObserver: ResizeObserver | null = null;

function handleWindowResize() {
    updatePill(false);
}

function measureActiveTab(track: HTMLElement, active: HTMLElement) {
    const trackRect = track.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    return {
        width: `${active.offsetWidth}px`,
        height: `${active.offsetHeight}px`,
        transform: `translate(${tabRect.left - trackRect.left}px, ${tabRect.top - trackRect.top}px)`
    };
}

function updatePill(animate = false) {
    if (!isPilled.value || !trackRef.value) return;

    const active = trackRef.value.querySelector<HTMLElement>('.v-tab--selected');
    if (!active || active.offsetWidth <= 0 || active.offsetHeight <= 0) return;

    pillStyle.value = measureActiveTab(trackRef.value, active);
    pillVisible.value = true;
    pillAnimate.value = animate;
}

function schedulePillUpdate(animate = false) {
    nextTick(() => updatePill(animate));
}

watch(currentValue, () => schedulePillUpdate(true));
watch(isPilled, (enabled) => {
    if (!enabled) {
        pillVisible.value = false;
        pillAnimate.value = false;
        return;
    }
    nextTick(() => {
        if (trackRef.value && resizeObserver) resizeObserver.observe(trackRef.value);
        updatePill(false);
    });
});
watch(
    () => props.grow,
    () => schedulePillUpdate(false)
);
watch(
    () => props.tabs,
    () => schedulePillUpdate(false),
    { deep: true }
);

onMounted(() => {
    schedulePillUpdate(false);
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => updatePill(false));
        if (trackRef.value) resizeObserver.observe(trackRef.value);
    }
    window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleWindowResize);
});
</script>

<template>
    <v-sheet elevation="0" class="app-base-tabs" :class="{ 'app-base-tabs--pilled': isPilled }">
        <div
            ref="trackRef"
            :class="[
                {
                    'app-base-tabs__track': isPilled,
                    'app-base-tabs__track--grow': isPilled && props.grow
                },
                trackAlignClass
            ]"
        >
            <div
                v-if="isPilled"
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
                    :ripple="isPilled ? false : undefined"
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
                    <v-chip
                        v-if="hasChip(item)"
                        class="app-base-tabs__chip"
                        :color="isPilled ? undefined : 'primary'"
                        size="x-small"
                        :variant="isPilled ? 'tonal' : 'flat'"
                    >
                        {{ item.chip }}
                    </v-chip>
                </v-tab>
            </v-tabs>
        </div>

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
/* Segmented control (réf. pill) — pastille active reste en couleur primary. */
.app-base-tabs--pilled {
    width: 100%;
    background: transparent !important;

    .app-base-tabs__track {
        position: relative;
        display: inline-flex;
        width: fit-content;
        max-width: 100%;
        padding: 0;
        border-radius: 9999px;
        overflow: hidden;
        background-color: rgb(var(--v-theme-surface));
        border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
        box-shadow:
            0 1px 2px rgba(var(--v-theme-on-surface), 0.06),
            0 2px 8px rgba(var(--v-theme-on-surface), 0.08);

        &--grow {
            display: flex;
            width: 100%;

            .app-base-tabs__list {
                width: 100% !important;
                flex: 1 1 auto !important;

                :deep(.v-slide-group),
                :deep(.v-slide-group__content) {
                    width: 100% !important;
                    flex: 1 1 auto !important;
                }

                :deep(.v-tab) {
                    flex: 1 1 0;
                    justify-content: center;
                }
            }
        }

        &--center {
            display: flex;
            width: fit-content;
            margin-inline: auto;
        }

        &--end {
            display: flex;
            width: fit-content;
            margin-inline-start: auto;
        }
    }

    .app-base-tabs__pill {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
        border-radius: 9999px;
        background-color: rgb(var(--v-theme-primary));
        pointer-events: none;
        opacity: 0;
        will-change: transform, width, height;

        &--visible {
            opacity: 1;
        }

        &--animate {
            transition:
                transform 0.25s cubic-bezier(0.32, 0.72, 0, 1),
                width 0.25s cubic-bezier(0.32, 0.72, 0, 1),
                height 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        }
    }

    .app-base-tabs__list {
        --v-tabs-height: auto;
        position: relative;
        z-index: 1;
        width: auto !important;
        flex: 0 0 auto !important;
        height: auto !important;
        min-height: 0;
        background: transparent !important;
        overflow: visible;

        :deep(.v-slide-group) {
            flex: 0 0 auto !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
        }

        :deep(.v-slide-group__container) {
            height: auto !important;
            overflow: visible !important;
        }

        :deep(.v-slide-group__content) {
            gap: 0;
            height: auto !important;
            align-items: center;
            flex: 0 0 auto !important;
        }

        /* Flèches Vuetify cassent le look segmented : on les masque en mode pilled. */
        :deep(.v-slide-group__prev),
        :deep(.v-slide-group__next) {
            display: none !important;
        }

        :deep(.v-tab) {
            flex: 0 0 auto;
            min-width: auto;
            height: auto;
            min-height: 40px;
            padding: 8px 16px;
            border-radius: 9999px !important;
            letter-spacing: normal;
            text-transform: none;
            font-size: 0.875rem;
            font-weight: 500;
            color: rgba(var(--v-theme-textPrimary), 0.78);
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            opacity: 1;
            transition: color 0.2s ease;

            .v-btn__content {
                flex: 0 0 auto;
                align-items: center;
                gap: 8px;
            }

            .app-base-tabs__icon {
                flex-shrink: 0;
                width: 18px;
                height: 18px;
            }

            .app-base-tabs__label {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                white-space: nowrap;

                &::after {
                    content: attr(data-label);
                    height: 0;
                    overflow: hidden;
                    visibility: hidden;
                    user-select: none;
                    pointer-events: none;
                    font-weight: 600;
                    letter-spacing: inherit;
                    font-size: inherit;
                }
            }

            .v-btn__overlay,
            .v-btn__underlay,
            .v-ripple__container {
                display: none !important;
                opacity: 0 !important;
            }

            .v-tab__slider {
                display: none;
            }

            &:hover:not(:active):not(.v-tab--selected):not(.v-tab--disabled) {
                color: rgb(var(--v-theme-textPrimary));
            }

            &:focus,
            &:active,
            &:focus-visible {
                background-color: transparent !important;
                box-shadow: none !important;
            }

            &:active:not(.v-tab--selected):not(.v-tab--disabled) {
                color: rgba(var(--v-theme-textPrimary), 0.78);
            }

            &.v-tab--disabled {
                opacity: 0.4;
            }
        }

        :deep(.app-base-tabs__tab--active),
        :deep(.v-tab--selected) {
            font-weight: 600;
            color: #fff !important;
            background-color: transparent !important;
            box-shadow: none !important;

            &:hover,
            &:focus,
            &:active,
            &:focus-visible {
                color: #fff !important;
                background-color: transparent !important;
                box-shadow: none !important;
            }

            .app-base-tabs__chip {
                color: #fff !important;
                background: rgba(255, 255, 255, 0.22) !important;
            }
        }
    }
}

@media (prefers-reduced-motion: reduce) {
    .app-base-tabs--pilled .app-base-tabs__pill--animate {
        transition: none;
    }
}
</style>
