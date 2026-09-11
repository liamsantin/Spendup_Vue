<script setup lang="ts">
defineOptions({ name: 'RecurringCreateMenu' });

import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import RecurringKindOption from '@/features/recurring-payments/components/forms/RecurringKindOption.vue';
import type { RecurringKind } from '@/features/recurring-payments/types';

withDefaults(
    defineProps<{
        disabled?: boolean;
        label: string;
    }>(),
    { disabled: false }
);

const emit = defineEmits<{
    select: [kind: RecurringKind];
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
            <div class="recurring-create-menu__list" role="list">
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

.recurring-create-menu__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
</style>
