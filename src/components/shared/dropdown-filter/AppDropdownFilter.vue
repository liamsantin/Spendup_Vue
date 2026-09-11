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
    }>(),
    {
        icon: undefined,
        location: 'bottom end',
        minWidth: 260,
        resetDisabled: false,
        closeOnContentClick: false,
        count: 0
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
    <v-menu v-model="open" :location="location" :close-on-content-click="closeOnContentClick">
        <template #activator="{ props: menuProps }">
            <button type="button" class="su-btn" v-bind="menuProps">
                <component :is="resolvedIcon" :size="16" stroke-width="1.6" />
                {{ label }}
                <span v-if="count > 0" class="su-btn__count">{{ count }}</span>
            </button>
        </template>
        <v-sheet rounded="md" elevation="0" class="su-menu app-dropdown-filter" :min-width="minWidth">
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
</style>
