<script setup lang="ts">
/**
 * Bouton tonal + menu de filtres (ne se ferme pas au clic dans le contenu).
 * Pied : Réinitialiser (`reset`).
 */
defineOptions({ name: 'AppDropdownFilter' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Anchor } from 'vuetify';
import { AdjustmentsHorizontalIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        /** Libellé du bouton déclencheur. */
        label: string;
        /** Icône vue-tabler à gauche du libellé. */
        icon?: unknown;
        location?: Anchor;
        minWidth?: number | string;
        resetDisabled?: boolean;
        closeOnContentClick?: boolean;
        /** Nombre de critères actifs (pastille sur le bouton). */
        count?: number;
        /** Sur téléphone : panneau bas pleine largeur (listes de filtres longues). */
        mobileSheet?: boolean;
    }>(),
    {
        icon: undefined,
        location: 'bottom end',
        minWidth: 260,
        resetDisabled: false,
        closeOnContentClick: false,
        count: 0,
        mobileSheet: false
    }
);

const emit = defineEmits<{
    reset: [];
}>();

const { t } = useI18n();
const open = ref(false);
const resolvedIcon = computed(() => props.icon ?? AdjustmentsHorizontalIcon);

function onReset() {
    if (props.resetDisabled) return;
    emit('reset');
    open.value = false;
}
</script>

<template>
    <v-menu v-model="open" :location="location" :close-on-content-click="closeOnContentClick" scrim>
        <template #activator="{ props: menuProps }">
            <button type="button" class="su-btn" v-bind="menuProps">
                <component :is="resolvedIcon" :size="16" stroke-width="1.6" />
                {{ label }}
                <span v-if="count > 0" class="su-btn__count">{{ count }}</span>
            </button>
        </template>
        <v-sheet
            rounded="md"
            elevation="0"
            class="su-menu app-dropdown-filter"
            :class="{ 'app-dropdown-filter--sheet': mobileSheet }"
            :min-width="minWidth"
        >
            <div v-if="mobileSheet" class="app-dropdown-filter__sheet-head">
                <span class="app-dropdown-filter__handle" aria-hidden="true" />
                <p class="app-dropdown-filter__title">{{ label }}</p>
            </div>
            <div class="app-dropdown-filter__body">
                <slot />
            </div>
            <div class="app-dropdown-filter__footer">
                <button type="button" class="su-btn app-dropdown-filter__reset" :disabled="resetDisabled" @click="onReset">
                    {{ t('common.reset') }}
                </button>
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.app-dropdown-filter {
    display: flex;
    flex-direction: column;
}

.app-dropdown-filter__footer {
    padding: 8px 6px 4px;
    margin-top: 4px;
    border-top: 1px solid var(--hair);
}

.app-dropdown-filter__reset {
    width: 100%;
    justify-content: center;
    text-align: center;
    border-radius: 999px;
    background: transparent;
    box-shadow: none;
    color: #9f2d23;
    border: 1px solid #9f2d23;
}

.app-dropdown-filter__reset:hover:not(:disabled) {
    background: rgba(180, 35, 24, 0.06);
    color: #9f2d23;
}

.app-dropdown-filter :deep(.app-select--active:not(.app-select--error) .app-select__control) {
    border-color: rgb(var(--v-theme-primary));
}

.app-dropdown-filter :deep(.app-select--active:not(.app-select--error) .app-select__control:hover:not(:has(.app-select__input:disabled))),
.app-dropdown-filter :deep(.app-select--active:not(.app-select--error) .app-select__control:focus-within),
.app-dropdown-filter :deep(.app-select--active:not(.app-select--error) .app-select__control--open) {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.18);
}

.app-dropdown-filter :deep(.app-select--active:not(.app-select--error) .app-select__legend) {
    color: rgb(var(--v-theme-primary));
}

.app-dropdown-filter :deep(.v-field--dirty .v-field__outline) {
    color: rgb(var(--v-theme-primary));
}

.app-dropdown-filter :deep(.v-field--dirty.v-field--focused .v-field__outline) {
    color: rgb(var(--v-theme-primary));
}
</style>

<style>
@media (max-width: 767px) {
    .v-overlay:has(.app-dropdown-filter--sheet) .v-overlay__content {
        width: 100% !important;
        max-width: 100vw !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        top: auto !important;
        transform: none !important;
        margin: 0 !important;
    }

    .app-dropdown-filter--sheet.su-menu {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        max-height: min(85dvh, 720px);
        display: flex;
        flex-direction: column;
        border-radius: 28px 28px 0 0 !important;
        padding: 6px 8px max(14px, env(safe-area-inset-bottom)) !important;
    }

    .app-dropdown-filter__sheet-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: none;
        padding: 4px 8px 6px;
    }

    .app-dropdown-filter__handle {
        width: 36px;
        height: 4px;
        border-radius: 999px;
        background: var(--thread);
    }

    .app-dropdown-filter__title {
        margin: 0;
        width: 100%;
        font-size: 1rem;
        font-weight: 650;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--ink);
    }

    .app-dropdown-filter--sheet .app-dropdown-filter__body {
        min-height: 0;
        flex: 1 1 auto;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
    }

    .app-dropdown-filter--sheet .app-dropdown-filter__footer {
        flex: none;
        padding: 10px 6px 4px;
    }
}

@media (min-width: 768px) {
    .app-dropdown-filter__sheet-head {
        display: none;
    }
}
</style>
