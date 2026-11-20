<script setup lang="ts">
/**
 * Bouton principal « + Ajouter » avec chevron : ouvre le menu déroulant des natures de tiers.
 */
defineOptions({ name: 'TierCreateMenu' });

import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import { TIER_CREATE_NATURES } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';
import TierNatureOption from '@/features/tiers/components/forms/TierNatureOption.vue';

withDefaults(
    defineProps<{
        disabled?: boolean;
        label: string;
        /** Téléphone : bouton carré avec le seul « + ». */
        compact?: boolean;
    }>(),
    { disabled: false, compact: false }
);

const emit = defineEmits<{
    select: [nature: TierNature];
}>();
</script>

<template>
    <v-menu location="bottom end" :offset="8" scrim>
        <template #activator="{ props: menuProps }">
            <button
                type="button"
                class="su-btn su-btn--ink app-board__primary tier-create-menu__trigger"
                :class="{ 'tier-create-menu__trigger--compact': compact }"
                v-bind="menuProps"
                :disabled="disabled"
                :aria-label="label"
                aria-haspopup="true"
            >
                <PlusIcon :size="16" stroke-width="1.8" />
                <template v-if="!compact">
                    {{ label }}
                    <ChevronDownIcon :size="16" stroke-width="1.8" />
                </template>
            </button>
        </template>
        <v-sheet elevation="0" class="su-menu tier-create-menu">
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
    width: min(360px, calc(100vw - 24px));
}

.tier-create-menu__list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

/* téléphone : carré 40 px, icône seule */
.tier-create-menu__trigger--compact {
    width: 40px;
    padding: 0;
}
</style>
