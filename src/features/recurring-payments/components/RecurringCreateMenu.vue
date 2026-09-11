<script setup lang="ts">
defineOptions({ name: 'RecurringCreateMenu' });

import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import RecurringKindOption from '@/features/recurring-payments/components/forms/RecurringKindOption.vue';
import RecurringTypeChoice, {
    type RecurringTypePick
} from '@/features/recurring-payments/components/forms/RecurringTypeChoice.vue';
import type { RecurringKind } from '@/features/recurring-payments/types';

withDefaults(
    defineProps<{
        disabled?: boolean;
        label: string;
        kind?: RecurringKind | null;
    }>(),
    { disabled: false, kind: null }
);

const emit = defineEmits<{
    select: [kind: RecurringKind];
    pick: [pick: RecurringTypePick];
}>();
</script>

<template>
    <v-menu location="bottom end" :offset="8">
        <template #activator="{ props: menuProps }">
            <button type="button" class="su-btn su-btn--ink" v-bind="menuProps" :disabled="disabled">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ label }}
                <ChevronDownIcon :size="16" stroke-width="1.8" />
            </button>
        </template>
        <v-sheet rounded="md" width="328" elevation="0" class="su-menu recurring-create-menu">
            <div v-if="kind" class="recurring-create-menu__types">
                <RecurringTypeChoice :kind="kind" variant="menu" @select="emit('pick', $event)" />
            </div>
            <div v-else class="recurring-create-menu__list" role="list">
                <RecurringKindOption kind="expense" variant="menu" role="listitem" @select="emit('select', 'expense')" />
                <RecurringKindOption kind="income" variant="menu" role="listitem" @select="emit('select', 'income')" />
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.recurring-create-menu.su-menu {
    padding: 10px 8px !important;
}

.recurring-create-menu__list,
.recurring-create-menu__types {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: min(70vh, 420px);
    overflow: auto;
}
</style>
