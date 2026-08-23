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

const trackRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const pillVisible = ref(false);
const pillAnimate = ref(false);
const pillStyle = ref<Record<string, string>>({
    width: '0px',
    height: '0px',
    transform: 'translate(0px, 0px)'
});

const isOverflowing = ref(false);
const canScrollPrev = ref(false);
const canScrollNext = ref(false);

const ARROW_RESERVE_PX = 72;

let resizeObserver: ResizeObserver | null = null;

function asElement(value: unknown): HTMLElement | null {
    if (!value) return null;
    if (value instanceof HTMLElement) return value;
    const maybe = value as { $el?: unknown };
    const el = maybe.$el;
    if (el instanceof HTMLElement) return el;
    // Vue / Vuetify: $el can be a comment node before the real root.
    if (el && typeof el === 'object' && 'nextElementSibling' in el) {
        const next = (el as ChildNode).nextElementSibling;
        if (next instanceof HTMLElement) return next;
    }
    return null;
}

function measureTabsWidth(track: HTMLElement): number {
    const content = track.querySelector<HTMLElement>('.v-slide-group__content');
    if (content && content.scrollWidth > 0) return content.scrollWidth;

    let width = 0;
    track.querySelectorAll<HTMLElement>('.v-tab').forEach((tab) => {
        width += tab.offsetWidth;
    });
    return width;
}

/**
 * Compare la largeur intrinsèque des tabs à la largeur du host.
 * (scrollWidth - clientWidth sur un track `fit-content` reste à 0 : le track s'étire avec le contenu.)
 */
function updateScrollState() {
    if (!isPilled.value || props.grow || !trackRef.value) {
        isOverflowing.value = false;
        canScrollPrev.value = false;
        canScrollNext.value = false;
        return;
    }

    const track = trackRef.value;
    const hostEl = asElement(rootRef.value) ?? (track.closest('.app-base-tabs') as HTMLElement | null);
    if (!hostEl) return;

    const parent = hostEl.parentElement;
    const contentWidthOf = (el: HTMLElement) => {
        const cs = getComputedStyle(el);
        const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        return Math.max(0, el.clientWidth - pad);
    };
    // Parent content box (header) is the real available width — host can grow with tabs.
    const available = parent ? contentWidthOf(parent) : hostEl.clientWidth;
    if (available <= 0) return;

    const tabsWidth = measureTabsWidth(track);
    const overflowing = tabsWidth > available + 1;
    isOverflowing.value = overflowing;

    if (!overflowing) {
        canScrollPrev.value = false;
        canScrollNext.value = false;
        return;
    }

    // Track contraint (classe --scrollable) : position de scroll réelle.
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll > 1) {
        canScrollPrev.value = track.scrollLeft > 1;
        canScrollNext.value = track.scrollLeft < maxScroll - 1;
        return;
    }

    // Layout pas encore appliqué : on suppose qu'on est au début.
    canScrollPrev.value = false;
    canScrollNext.value = tabsWidth > available - ARROW_RESERVE_PX;
}

function scrollTabs(direction: -1 | 1) {
    if (!trackRef.value) return;
    const delta = Math.max(140, Math.floor(trackRef.value.clientWidth * 0.65));
    trackRef.value.scrollBy({ left: direction * delta, behavior: 'smooth' });
}

function scrollActiveIntoView() {
    if (!trackRef.value || !isOverflowing.value) return;
    const active = trackRef.value.querySelector<HTMLElement>('.v-tab--selected');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
}

function handleWindowResize() {
    updateScrollState();
    updatePill(false);
}

function measureActiveTab(track: HTMLElement, active: HTMLElement) {
    const trackRect = track.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    return {
        width: `${active.offsetWidth}px`,
        height: `${active.offsetHeight}px`,
        transform: `translate(${tabRect.left - trackRect.left + track.scrollLeft}px, ${tabRect.top - trackRect.top}px)`
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

function scheduleLayoutUpdate(animatePill = false) {
    nextTick(() => {
        updateScrollState();
        // 2e frame : après application de --scrollable / flèches.
        requestAnimationFrame(() => {
            updateScrollState();
            updatePill(animatePill);
            if (animatePill) scrollActiveIntoView();
        });
    });
}

watch(currentValue, () => scheduleLayoutUpdate(true));
watch(isPilled, (enabled) => {
    if (!enabled) {
        pillVisible.value = false;
        pillAnimate.value = false;
        isOverflowing.value = false;
        return;
    }
    scheduleLayoutUpdate(false);
});
watch(
    () => props.grow,
    () => scheduleLayoutUpdate(false)
);
watch(
    () => props.tabs,
    () => scheduleLayoutUpdate(false),
    { deep: true }
);
watch(isOverflowing, () => {
    nextTick(() => {
        updateScrollState();
        updatePill(false);
    });
});

onMounted(() => {
    scheduleLayoutUpdate(false);
    window.addEventListener('resize', handleWindowResize);

    nextTick(() => {
        if (typeof ResizeObserver === 'undefined') return;

        resizeObserver = new ResizeObserver(() => {
            updateScrollState();
            updatePill(false);
        });

        const observe = (value: unknown) => {
            if (value instanceof Element) {
                resizeObserver?.observe(value);
                return;
            }
            const el = asElement(value);
            if (el) resizeObserver?.observe(el);
        };

        const rootEl = asElement(rootRef.value);
        observe(rootEl);
        if (rootEl?.parentElement) observe(rootEl.parentElement);
        observe(trackRef.value);
        observe(trackRef.value?.querySelector('.v-slide-group__content'));
    });
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleWindowResize);
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
                    <path
                        d="M15 6l-6 6 6 6"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
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
                @scroll.passive="
                    () => {
                        updateScrollState();
                        updatePill(false);
                    }
                "
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
                        <v-chip
                            v-if="hasChip(item)"
                            class="app-base-tabs__chip"
                            size="x-small"
                            variant="tonal"
                        >
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
                    <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
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
                    <v-chip
                        v-if="hasChip(item)"
                        class="app-base-tabs__chip"
                        color="primary"
                        size="x-small"
                        variant="flat"
                    >
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

<style scoped lang="scss">
.app-base-tabs--pilled {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    background: transparent !important;

    .app-base-tabs__nav {
        display: flex;
        align-items: stretch;
        width: 100%;
        max-width: 100%;
        gap: 4px;

        &:not(.app-base-tabs__nav--overflow).app-base-tabs__nav--center {
            justify-content: center;
        }

        &:not(.app-base-tabs__nav--overflow).app-base-tabs__nav--end {
            justify-content: flex-end;
        }
    }

    .app-base-tabs__arrow {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
        border-radius: 9999px;
        background: rgb(var(--v-theme-surface));
        color: rgba(var(--v-theme-on-surface), 0.72);
        cursor: pointer;
        box-shadow:
            0 1px 2px rgba(var(--v-theme-on-surface), 0.06),
            0 2px 8px rgba(var(--v-theme-on-surface), 0.08);

        &:disabled {
            opacity: 0.35;
            cursor: default;
        }

        &:not(:disabled):hover {
            color: rgb(var(--v-theme-on-surface));
        }

        .app-base-tabs__arrow-icon {
            display: block;
            flex-shrink: 0;
            color: inherit;
            stroke: currentColor;
        }
    }

    .app-base-tabs__track {
        position: relative;
        display: inline-flex;
        width: fit-content;
        max-width: 100%;
        min-width: 0;
        padding: 0;
        border-radius: 9999px;
        overflow: hidden;
        background-color: rgb(var(--v-theme-surface));
        border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
        box-shadow:
            0 1px 2px rgba(var(--v-theme-on-surface), 0.06),
            0 2px 8px rgba(var(--v-theme-on-surface), 0.08);

        &--scrollable {
            flex: 1 1 0;
            width: auto;
            max-width: none;
            min-width: 0;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;

            &::-webkit-scrollbar {
                display: none;
            }
        }

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

        /* Always hide Vuetify arrows in pilled mode. */
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
