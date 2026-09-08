<script setup lang="ts">
defineOptions({ name: 'TierCreateMenu' });

import { useI18n } from 'vue-i18n';
import { ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import { TIER_CREATE_NATURES, TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';

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

const { t } = useI18n();
</script>

<template>
    <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
            <button type="button" class="su-btn su-btn--ink" v-bind="menuProps" :disabled="disabled">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ label }}
                <ChevronDownIcon :size="16" stroke-width="1.8" />
            </button>
        </template>
        <v-sheet rounded="md" width="300" elevation="0" class="su-menu">
            <v-list class="py-1" density="comfortable">
                <v-list-item
                    v-for="nature in TIER_CREATE_NATURES"
                    :key="nature"
                    class="px-3"
                    :title="t(`tiersPage.createAs.${nature}`)"
                    :subtitle="t(`tiersPage.createHints.${nature}`)"
                    @click="emit('select', nature)"
                >
                    <template #prepend>
                        <span class="tier-create-menu__icon" :class="`tier-create-menu__icon--${nature}`">
                            <component :is="TIER_NATURE_ICONS[nature]" :size="18" stroke-width="1.8" />
                        </span>
                    </template>
                </v-list-item>
            </v-list>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.tier-create-menu__icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-right: 10px;
    border-radius: 10px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tier-create-menu__icon--person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-create-menu__icon--organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-create-menu__icon--administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-create-menu__icon--unknown {
    background: var(--hair);
    color: var(--ink-muted);
}
</style>
