<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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

const trackRef = ref<HTMLElement | null>(null);
const pillReady = ref(false);
const pillStyle = ref<Record<string, string>>({
    width: '0px',
    height: '0px',
    transform: 'translate(0px, 0px)'
});

let resizeObserver: ResizeObserver | null = null;

const tabsBgColor = computed(() => (props.pilled ? undefined : 'grey100'));
const tabsColor = computed(() => (props.pilled ? undefined : 'primary'));
const tabsHeight = computed(() => (props.pilled ? undefined : 52));

function handleWindowResize() {
    updatePill(false);
}

function updatePill(animate = true) {
    if (!props.pilled || !trackRef.value) return;

    const active = trackRef.value.querySelector<HTMLElement>('.v-tab--selected');
    if (!active) return;

    const trackRect = trackRef.value.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    const next = {
        width: `${tabRect.width}px`,
        height: `${tabRect.height}px`,
        transform: `translate(${tabRect.left - trackRect.left}px, ${tabRect.top - trackRect.top}px)`
    };

    if (!animate) {
        pillReady.value = false;
        pillStyle.value = next;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                pillReady.value = true;
            });
        });
        return;
    }

    pillReady.value = true;
    pillStyle.value = next;
}

function schedulePillUpdate(animate = true) {
    nextTick(() => updatePill(animate));
}

watch(
    () => props.modelValue,
    () => schedulePillUpdate(true)
);
watch(
    () => props.pilled,
    (enabled) => {
        if (enabled) {
            nextTick(() => {
                if (trackRef.value && resizeObserver) resizeObserver.observe(trackRef.value);
                updatePill(false);
            });
        }
    }
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
    <div class="settings-page" :class="{ 'settings-page--embedded': props.embedded }">
        <v-card
            :elevation="props.embedded ? 0 : 10"
            :rounded="props.embedded ? 0 : 'md'"
            class="settings-page-card"
            :class="{ 'settings-page-card--embedded': props.embedded }"
        >
            <FriendLiveChips v-if="!props.embedded" />

            <div
                ref="trackRef"
                class="settings-tabs-track flex-grow-0"
                :class="{ 'settings-tabs-track--pilled': props.pilled }"
            >
                <div
                    v-if="props.pilled"
                    class="settings-tabs__pill"
                    :class="{ 'settings-tabs__pill--ready': pillReady }"
                    :style="pillStyle"
                    aria-hidden="true"
                />

                <v-tabs
                    :model-value="modelValue"
                    :bg-color="tabsBgColor"
                    density="comfortable"
                    :height="tabsHeight"
                    :color="tabsColor"
                    :align-tabs="alignTabs"
                    show-arrows
                    class="settings-tabs"
                    :class="{ 'settings-tabs--pilled': props.pilled }"
                    :selected-class="props.pilled ? 'settings-tabs__tab--active' : undefined"
                    @update:model-value="emit('update:modelValue', String($event))"
                >
                    <v-tab
                        v-for="tab in tabs"
                        :key="tab.value"
                        :value="tab.value"
                        class="text-medium-emphasis"
                        :ripple="props.pilled ? false : undefined"
                    >
                        <component :is="tab.icon" v-if="tab.icon" class="mr-2" size="18" />
                        {{ tab.label }}
                        <v-chip
                            v-if="tab.chip != null && tab.chip !== '' && Number(tab.chip) !== 0"
                            class="ml-2"
                            :color="props.pilled ? undefined : 'primary'"
                            size="x-small"
                            :variant="props.pilled ? 'tonal' : 'flat'"
                        >
                            {{ tab.chip }}
                        </v-chip>
                    </v-tab>
                </v-tabs>
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

@media screen and (max-width: 767px) {
    .settings-page:not(.settings-page--embedded) {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page:not(.settings-page--embedded) .settings-page-card {
        border-radius: 0 !important;
    }

    .settings-tabs-toolbar {
        padding: 12px 16px 4px;
    }
}

.settings-tabs-track {
    position: relative;
}

.settings-tabs-track--pilled {
    padding: 6px 8px;
    margin: 8px 12px 4px;
    border-radius: 12px;
    overflow: hidden;
    background-color: rgba(var(--v-theme-on-surface), 0.02);
    background-image:
        linear-gradient(rgba(var(--v-theme-on-surface), 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(var(--v-theme-on-surface), 0.045) 1px, transparent 1px);
    background-size: 10px 10px;
}

.settings-tabs__pill {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    border-radius: 10px;
    background-color: rgb(var(--v-theme-primary));
    pointer-events: none;
    will-change: transform, width, height;
}

.settings-tabs__pill--ready {
    transition:
        transform 0.25s cubic-bezier(0.32, 0.72, 0, 1),
        width 0.25s cubic-bezier(0.32, 0.72, 0, 1),
        height 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.settings-tabs :deep(.v-tab) {
    min-height: 52px;
    font-size: 0.875rem;
}

.settings-tabs--pilled {
    --v-tabs-height: auto;
    position: relative;
    z-index: 1;
    height: auto !important;
    min-height: 0;
    background: transparent !important;
    overflow: visible;
}

.settings-tabs--pilled :deep(.v-slide-group),
.settings-tabs--pilled :deep(.v-slide-group__container) {
    height: auto !important;
    overflow: visible !important;
}

.settings-tabs--pilled :deep(.v-slide-group__content) {
    gap: 4px;
    height: auto !important;
    align-items: center;
}

.settings-tabs--pilled :deep(.v-tab) {
    min-width: auto;
    height: auto;
    min-height: 36px;
    padding: 8px 12px;
    border-radius: 10px !important;
    letter-spacing: normal;
    text-transform: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(var(--v-theme-textPrimary), 0.55);
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    opacity: 1;
    transition: color 0.2s ease;
}

.settings-tabs--pilled :deep(.v-tab .v-btn__overlay),
.settings-tabs--pilled :deep(.v-tab .v-btn__underlay),
.settings-tabs--pilled :deep(.v-tab .v-ripple__container) {
    display: none !important;
    opacity: 0 !important;
}

.settings-tabs--pilled :deep(.v-tab .v-tab__slider) {
    display: none;
}

.settings-tabs--pilled :deep(.v-tab:hover:not(:active):not(.v-tab--selected):not(.v-tab--disabled)) {
    color: rgb(var(--v-theme-textPrimary));
}

.settings-tabs--pilled :deep(.v-tab:focus),
.settings-tabs--pilled :deep(.v-tab:active),
.settings-tabs--pilled :deep(.v-tab:focus-visible) {
    background-color: transparent !important;
    box-shadow: none !important;
}

.settings-tabs--pilled :deep(.settings-tabs__tab--active),
.settings-tabs--pilled :deep(.v-tab--selected) {
    font-weight: 700;
    color: #fff !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

.settings-tabs--pilled :deep(.settings-tabs__tab--active:hover),
.settings-tabs--pilled :deep(.settings-tabs__tab--active:focus),
.settings-tabs--pilled :deep(.settings-tabs__tab--active:active),
.settings-tabs--pilled :deep(.settings-tabs__tab--active:focus-visible),
.settings-tabs--pilled :deep(.v-tab--selected:hover),
.settings-tabs--pilled :deep(.v-tab--selected:focus),
.settings-tabs--pilled :deep(.v-tab--selected:active),
.settings-tabs--pilled :deep(.v-tab--selected:focus-visible) {
    color: #fff !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

.settings-tabs--pilled :deep(.v-tab--selected .v-chip) {
    color: #fff !important;
    background: rgba(255, 255, 255, 0.22) !important;
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

@media (prefers-reduced-motion: reduce) {
    .settings-tabs__pill--ready {
        transition: none;
    }
}
</style>
