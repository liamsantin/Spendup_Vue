<script setup lang="ts">
/**
 * Shell modal standard Spend.Up — header fixe, body (optionnellement scrollable), footer fixe.
 *
 * Tablette/desktop : dialog centrée, hauteur plafonnée, perfect-scrollbar.
 * Téléphone (`smAndDown`) selon `mobileLayout` :
 * - `dialog` (défaut) : overlay compact, scroll natif
 * - `fullscreen` : écran (détail, formulaires longs)
 * - `sheet` : bottom sheet (~85dvh)
 */
defineOptions({ name: 'AppModalBase' });

import { computed, nextTick, ref } from 'vue';
import { XIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

export type AppModalMobileLayout = 'dialog' | 'fullscreen' | 'sheet';

const { t } = useI18n();
const { smAndDown } = useDisplay();

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        subtitle?: string;
        maxWidth?: number | string;
        /** Hauteur max. de la card (px ou CSS), plafonnée à 85vh. Ignorée si `scrollable` est false. */
        height?: number | string;
        /**
         * Si `scrollable` : applique `height` comme hauteur réelle (plus seulement un plafond).
         * Utile quand le contenu est court (liste d’amis vide, etc.) mais la modale doit rester stable.
         */
        fixedHeight?: boolean;
        persistent?: boolean;
        /** Affiche le footer (slot `footer`). */
        showFooter?: boolean;
        /**
         * Active perfect-scrollbar sur le body.
         * Mettre à `false` quand le contenu ne déborde jamais (évite rails/scroll inutiles).
         */
        scrollable?: boolean;
        /**
         * Comportement téléphone uniquement.
         * `dialog` = overlay compact ; `fullscreen` = écran ; `sheet` = panneau bas.
         */
        mobileLayout?: AppModalMobileLayout;
    }>(),
    {
        subtitle: undefined,
        maxWidth: 520,
        height: 640,
        fixedHeight: false,
        persistent: true,
        showFooter: true,
        scrollable: true,
        mobileLayout: 'dialog'
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'after-enter': [];
}>();

const scrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const scrollbarOptions = PERFECT_SCROLLBAR_OPTIONS;

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isFullscreen = computed(() => smAndDown.value && props.mobileLayout === 'fullscreen');
const isSheet = computed(() => smAndDown.value && props.mobileLayout === 'sheet');
const usePerfectScrollbar = computed(() => props.scrollable && !smAndDown.value);
const fillConstrainedBody = computed(() => (isFullscreen.value || isSheet.value) && props.fixedHeight);

const heightCap = computed(() => {
    const height = typeof props.height === 'number' ? `${props.height}px` : props.height;
    return `min(${height}, 85dvh)`;
});

const dialogMaxWidth = computed(() => {
    if (isFullscreen.value) return undefined;
    if (isSheet.value) return '100%';
    return props.maxWidth;
});

const overlayContentClass = computed(() => (isSheet.value ? 'app-modal-overlay-content app-modal-overlay-content--sheet' : undefined));

const overlayContentProps = computed(() => {
    if (!isSheet.value) return undefined;
    return {
        class: overlayContentClass.value,
        style: {
            height: 'auto',
            maxHeight: '85dvh',
            width: '100%'
        }
    };
});

const cardRounded = computed(() => {
    if (isFullscreen.value) return 0;
    if (isSheet.value) return 't-md';
    return 'md';
});

const cardStyle = computed(() => {
    const cap = heightCap.value;
    if (isFullscreen.value) {
        return { height: '100%', minHeight: '100%', maxHeight: '100%' };
    }
    if (isSheet.value) {
        if (props.fixedHeight) {
            return { height: cap, minHeight: cap, maxHeight: '85dvh', width: '100%' };
        }
        return { maxHeight: '85dvh', width: '100%' };
    }
    if (props.fixedHeight) {
        return { height: cap, minHeight: cap, maxHeight: cap };
    }
    if (!props.scrollable) {
        return { maxHeight: '85dvh' };
    }
    return { maxHeight: cap };
});

const dialogTransition = computed(() => {
    if (isSheet.value) return 'dialog-bottom-transition';
    // Fade plutôt que scale : évite le “resize” visible (tabs, marges) à l’ouverture.
    if (isFullscreen.value) return undefined;
    return 'fade-transition';
});

async function refreshScrollbar() {
    if (!usePerfectScrollbar.value) return;
    await nextTick();
    scrollbarRef.value?.ps?.update();
}

function onAfterEnter() {
    refreshScrollbar();
    emit('after-enter');
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
    <!-- Fade (pas de scale) : marges/tabs ne “respirent” plus à l’ouverture. -->
    <v-dialog
        v-model="open"
        :fullscreen="isFullscreen"
        :max-width="dialogMaxWidth"
        :width="isSheet ? '100%' : undefined"
        :transition="dialogTransition"
        :content-class="overlayContentClass"
        :content-props="overlayContentProps"
        :persistent="persistent"
        @after-enter="onAfterEnter"
    >
        <v-card
            :rounded="cardRounded"
            class="app-modal-base su-modal"
            :class="{
                'app-modal-base--fixed-height': fixedHeight,
                'app-modal-base--mobile': isFullscreen,
                'app-modal-base--sheet': isSheet
            }"
            :style="cardStyle"
        >
            <div class="app-modal-base__header">
                <div class="pr-12">
                    <h5 class="text-h5">{{ title }}</h5>
                    <div v-if="subtitle" class="text-subtitle-1 text-medium-emphasis mt-1">{{ subtitle }}</div>
                    <slot name="header-extra" />
                </div>
                <button type="button" class="su-orb app-modal-base__close" :aria-label="t('common.close')" @click="close">
                    <XIcon :size="18" stroke-width="1.5" />
                </button>
            </div>

            <v-divider class="flex-grow-0" />

            <div v-if="$slots.toolbar" class="app-modal-base__toolbar flex-grow-0">
                <slot name="toolbar" />
            </div>

            <PerfectScrollbar v-if="usePerfectScrollbar" ref="scrollbarRef" class="app-modal-base__body" :options="scrollbarOptions">
                <div class="app-modal-base__body-inner">
                    <slot />
                </div>
            </PerfectScrollbar>

            <div
                v-else
                class="app-modal-base__body"
                :class="{
                    'app-modal-base__body--static': !scrollable && !isFullscreen && !isSheet,
                    'app-modal-base__body--native': smAndDown && !fillConstrainedBody
                }"
            >
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

.app-modal-base--fixed-height .app-modal-base__body,
.app-modal-base--fixed-height .app-modal-base__body--static {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.app-modal-base--fixed-height .app-modal-base__body-inner {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    padding-bottom: 16px;
    box-sizing: border-box;
}

.app-modal-base__body-inner {
    padding: 12px 24px 36px;
    width: 100%;
    box-sizing: border-box;
}

.app-modal-base__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
}

.app-modal-base--mobile {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
}

.app-modal-base--mobile .app-modal-base__header,
.app-modal-base--sheet .app-modal-base__header {
    padding: 16px 16px 12px;
}

.app-modal-base--mobile .app-modal-base__body-inner,
.app-modal-base--sheet .app-modal-base__body-inner {
    padding: 12px 16px 24px;
}

.app-modal-base__body--native {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.app-modal-base--mobile.app-modal-base--fixed-height .app-modal-base__body-inner,
.app-modal-base--sheet.app-modal-base--fixed-height .app-modal-base__body-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.app-modal-base--sheet .app-modal-base__footer {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
}
</style>

<style>
.app-modal-overlay-content--sheet {
    align-self: flex-end !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0;
    overflow: hidden;
}
</style>
