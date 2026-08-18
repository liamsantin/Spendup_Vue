<script setup lang="ts">
/**
 * Shell modal standard Spend.Up — header fixe, body (optionnellement scrollable), footer fixe.
 * À utiliser pour toutes les modales de l’application.
 *
 * `scrollable` : monte perfect-scrollbar sur le body. La card se dimensionne au contenu sans
 * dépasser `height`, donc le rail n’apparaît que s’il y a réellement débordement.
 * Sinon (ex. saisie OTP courte), le body est un bloc simple sans scroll.
 */
defineOptions({ name: 'AppModalBase' });

import { computed, nextTick, ref } from 'vue';
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
        /** Hauteur max. de la card (px ou CSS), plafonnée à 85vh. Ignorée si `scrollable` est false. */
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
    // Plafond seulement : la card s’adapte au contenu, donc pas de scroll tant qu’il ne déborde pas.
    return { maxHeight: `min(${height}, 85vh)` };
});

async function refreshScrollbar() {
    if (!props.scrollable) return;
    await nextTick();
    scrollbarRef.value?.ps?.update();
}

function close() {
    open.value = false;
}

defineExpose({
    refreshScrollbar,
    close
});
</script>

<template>
    <!-- La transition d’ouverture scale la card : perfect-scrollbar doit remesurer une fois figée. -->
    <v-dialog v-model="open" :max-width="maxWidth" :persistent="persistent" @after-enter="refreshScrollbar">
        <v-card rounded="md" class="app-modal-base" :style="cardStyle">
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

            <div v-if="$slots.toolbar" class="app-modal-base__toolbar flex-grow-0">
                <slot name="toolbar" />
            </div>

            <PerfectScrollbar v-if="scrollable" ref="scrollbarRef" class="app-modal-base__body" :options="scrollbarOptions">
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

.app-modal-base__toolbar {
    flex-shrink: 0;
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
