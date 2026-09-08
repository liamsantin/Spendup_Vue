<script setup lang="ts">
defineOptions({ name: 'TierCreateMenu' });

import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import { TIER_CREATE_NATURES } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';
import TierNatureOption from '@/features/tiers/components/forms/TierNatureOption.vue';

withDefaults(
    defineProps<{
        disabled?: boolean;
        label: string;
    }>(),
    { disabled: false }
);

const emit = defineEmits<{
    select: [nature: TierNature];
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
        <v-sheet rounded="md" width="328" elevation="0" class="su-menu tier-create-menu">
            <div class="tier-create-menu__list" role="list">
                <TierNatureOption
                    v-for="nature in TIER_CREATE_NATURES"
                    :key="nature"
                    :nature="nature"
                    variant="menu"
                    role="listitem"
                    @select="emit('select', nature)"
                />
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.tier-create-menu.su-menu {
    padding: 10px 8px !important;
}

.tier-create-menu__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
</style>
