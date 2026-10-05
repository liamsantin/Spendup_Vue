<script setup lang="ts">
defineOptions({ name: 'TierNatureChoice' });

import { TIER_CREATE_NATURES } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';
import TierNatureOption from '@/features/tiers/components/forms/TierNatureOption.vue';

const emit = defineEmits<{
    select: [nature: TierNature];
}>();
</script>

<template>
    <div class="tier-nature-choice" role="list">
        <TierNatureOption
            v-for="nature in TIER_CREATE_NATURES"
            :key="nature"
            :nature="nature"
            role="listitem"
            @select="emit('select', nature)"
        />
    </div>
</template>

<style scoped>
.tier-nature-choice {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
