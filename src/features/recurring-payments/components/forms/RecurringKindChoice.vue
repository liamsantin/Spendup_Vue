<script setup lang="ts">
defineOptions({ name: 'RecurringKindChoice' });

import RecurringKindOption from '@/features/recurring-payments/components/forms/RecurringKindOption.vue';
import type { RecurringKind } from '@/features/recurring-payments/types';

const emit = defineEmits<{
    select: [kind: RecurringKind];
}>();
</script>

<template>
    <div class="recurring-kind-choice" role="list">
        <RecurringKindOption kind="expense" role="listitem" @select="emit('select', 'expense')" />
        <RecurringKindOption kind="income" role="listitem" @select="emit('select', 'income')" />
    </div>
</template>

<style scoped>
.recurring-kind-choice {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
