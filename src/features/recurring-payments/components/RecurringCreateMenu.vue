<script setup lang="ts">
/** Bouton principal « + Ajouter » et son menu Swiss (nature puis type de récurrence). */
defineOptions({ name: 'RecurringCreateMenu' });

import { useDisplay } from 'vuetify';
import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import RecurringKindOption from '@/features/recurring-payments/components/forms/RecurringKindOption.vue';
import RecurringTypeChoice, { type RecurringTypePick } from '@/features/recurring-payments/components/forms/RecurringTypeChoice.vue';
import type { RecurringKind } from '@/features/recurring-payments/types';

withDefaults(
    defineProps<{
        disabled?: boolean;
        label: string;
        kind?: RecurringKind | null;
        compact?: boolean;
    }>(),
    { disabled: false, kind: null, compact: false }
);

const emit = defineEmits<{
    select: [kind: RecurringKind];
    pick: [pick: RecurringTypePick];
}>();

const { smAndDown } = useDisplay();
</script>

<template>
    <v-menu location="bottom end" :offset="8" scrim>
        <template #activator="{ props: menuProps }">
            <button type="button" class="su-btn su-btn--ink app-board__primary" v-bind="menuProps" :disabled="disabled" :aria-label="label">
                <PlusIcon :size="16" stroke-width="1.6" />
                <template v-if="!compact">
                    {{ label }}
                    <ChevronDownIcon :size="16" stroke-width="1.8" />
                </template>
            </button>
        </template>
        <v-sheet width="328" elevation="0" class="su-menu recurring-create-menu">
            <template v-if="kind">
                <PerfectScrollbar v-if="!smAndDown" class="recurring-create-menu__types" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <RecurringTypeChoice :kind="kind" variant="menu" @select="emit('pick', $event)" />
                </PerfectScrollbar>
                <div v-else class="recurring-create-menu__types recurring-create-menu__types--native">
                    <RecurringTypeChoice :kind="kind" variant="menu" @select="emit('pick', $event)" />
                </div>
            </template>
            <div v-else class="recurring-create-menu__list" role="list">
                <RecurringKindOption kind="expense" variant="menu" role="listitem" @select="emit('select', 'expense')" />
                <RecurringKindOption kind="income" variant="menu" role="listitem" @select="emit('select', 'income')" />
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.recurring-create-menu__list,
.recurring-create-menu__types {
    display: flex;
    flex-direction: column;
    max-height: min(70vh, 420px);
}

.recurring-create-menu__types {
    position: relative;
    padding-right: 6px;
}

.recurring-create-menu__types--native {
    overflow: auto;
    padding-right: 0;
}
</style>
