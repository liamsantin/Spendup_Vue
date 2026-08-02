<script setup lang="ts">
/**
 * Shell modal standard Spend.Up — header fixe, body (optionnellement scrollable), footer fixe.
 * À utiliser pour toutes les modales de l’application.
 *
 * `scrollable` : n’active perfect-scrollbar que si le contenu peut déborder.
 * Sinon (ex. saisie OTP courte), le body est un bloc simple sans scroll.
 */
defineOptions({ name: 'AppModalBase' });

import { computed, nextTick, ref, watch } from 'vue';
import { XIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        subtitle?: string;
        maxWidth?: number | string;
        /** Hauteur de la card (px ou CSS). Ignorée si `scrollable` est false (hauteur auto). */
        height?: number | string;
        persistent?: boolean;
        /** Affiche le footer (slot `footer`). */
        showFooter?: boolean;
        /**
         * Active perfect-scrollbar sur le body.
         * Mettre à `false` quand le contenu ne déborde jamais (évite rails/scroll inutiles).
         */
        scrollable?: boolean;
    }>(),
    {
        subtitle: undefined,
        maxWidth: 520,
        height: 640,
        persistent: true,
        showFooter: true,
        scrollable: true
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const scrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const scrollbarOptions = PERFECT_SCROLLBAR_OPTIONS;

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const cardStyle = computed(() => {
    if (!props.scrollable) {
        return { maxHeight: '85vh' };
    }
    const height = typeof props.height === 'number' ? `${props.height}px` : props.height;
    return { height, maxHeight: '85vh' };
});

const bodyStyle = computed(() => {
    if (!props.scrollable) return undefined;
    if (typeof props.height === 'number') {
        return {
            height: `${Math.max(props.height - 180, 240)}px`,
            maxHeight: 'calc(85vh - 160px)'
        };
    }
    return { height: '460px', maxHeight: 'calc(85vh - 160px)' };
});

async function refreshScrollbar() {
    if (!props.scrollable) return;
    await nextTick();
    scrollbarRef.value?.ps?.update();
}

function close() {
    open.value = false;
}

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            void refreshScrollbar();
        }
    }
);

defineExpose({
    refreshScrollbar,
    close
});
</script>

<template>
    <v-dialog v-model="open" :max-width="maxWidth" :persistent="persistent">
        <v-card rounded="md" class="app-modal-base" :class="{ 'app-modal-base--static': !scrollable }" :style="cardStyle">
            <div class="app-modal-base__header">
                <div class="pr-10">
                    <h5 class="text-h5">{{ title }}</h5>
                    <div v-if="subtitle" class="text-subtitle-1 text-medium-emphasis mt-1">{{ subtitle }}</div>
                    <slot name="header-extra" />
                </div>
                <v-btn class="app-modal-base__close" icon variant="text" size="small" :aria-label="t('common.close')" @click="close">
                    <XIcon size="20" />
                </v-btn>
            </div>

            <v-divider class="flex-grow-0" />

            <PerfectScrollbar
                v-if="scrollable"
                ref="scrollbarRef"
                class="app-modal-base__body"
                :style="bodyStyle"
                :options="scrollbarOptions"
            >
                <div class="app-modal-base__body-inner">
                    <slot />
                </div>
            </PerfectScrollbar>

            <div v-else class="app-modal-base__body app-modal-base__body--static">
                <div class="app-modal-base__body-inner">
                    <slot />
                </div>
            </div>

            <template v-if="showFooter">
                <v-divider class="flex-grow-0" />
                <div class="app-modal-base__footer">
                    <slot name="footer" :close="close" />
                </div>
            </template>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.app-modal-base {
    display: flex !important;
    flex-direction: column;
    overflow: hidden;
}

.app-modal-base--static {
    height: auto !important;
}

.app-modal-base__header {
    position: relative;
    flex-shrink: 0;
    padding: 20px 24px;
}

.app-modal-base__close {
    position: absolute;
    top: 12px;
    right: 12px;
}

.app-modal-base__body {
    flex: 1 1 auto;
    min-height: 0;
}

.app-modal-base__body--static {
    flex: 0 0 auto;
    overflow: hidden;
}

.app-modal-base__body-inner {
    padding: 24px;
    width: 100%;
    box-sizing: border-box;
}

.app-modal-base__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
}
</style>
