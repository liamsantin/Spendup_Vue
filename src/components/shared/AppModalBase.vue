<script setup lang="ts">
/**
 * Shell modal standard Spend.Up — header fixe, body scrollable (perfect-scrollbar), footer fixe.
 * À utiliser pour toutes les modales de l’application.
 */
defineOptions({ name: 'AppModalBase' });

import { computed, nextTick, ref, watch } from 'vue';
import { XIcon } from 'vue-tabler-icons';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        subtitle?: string;
        maxWidth?: number | string;
        /** Hauteur fixe de la card (px ou CSS). */
        height?: number | string;
        persistent?: boolean;
        /** Affiche le footer (slot `footer`). */
        showFooter?: boolean;
    }>(),
    {
        subtitle: undefined,
        maxWidth: 520,
        height: 640,
        persistent: true,
        showFooter: true
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const scrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const scrollbarOptions = { suppressScrollX: true };

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const cardHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height));

const bodyHeight = computed(() => {
    if (typeof props.height === 'number') {
        return `${Math.max(props.height - 180, 240)}px`;
    }
    return '460px';
});

async function refreshScrollbar() {
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
        <v-card rounded="md" class="app-modal-base" :style="{ height: cardHeight, maxHeight: '85vh' }">
            <div class="app-modal-base__header">
                <div class="pr-10">
                    <h5 class="text-h5">{{ title }}</h5>
                    <div v-if="subtitle" class="text-subtitle-1 text-medium-emphasis mt-1">{{ subtitle }}</div>
                    <slot name="header-extra" />
                </div>
                <v-btn class="app-modal-base__close" icon variant="text" size="small" aria-label="Fermer" @click="close">
                    <XIcon size="20" />
                </v-btn>
            </div>

            <v-divider class="flex-grow-0" />

            <PerfectScrollbar
                ref="scrollbarRef"
                class="app-modal-base__body"
                :style="{ height: bodyHeight, maxHeight: 'calc(85vh - 160px)' }"
                :options="scrollbarOptions"
            >
                <div class="app-modal-base__body-inner">
                    <slot />
                </div>
            </PerfectScrollbar>

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

.app-modal-base__body-inner {
    padding: 24px;
    width: 100%;
    box-sizing: border-box;
}

.app-modal-base__body :deep(.ps__rail-x) {
    display: none !important;
}

.app-modal-base__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
}
</style>
