<script setup lang="ts">
defineOptions({ name: 'TierNatureChoice' });

import { useI18n } from 'vue-i18n';
import { TIER_CREATE_NATURES, TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';

const emit = defineEmits<{
    select: [nature: TierNature];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="tier-nature-choice" role="list">
        <button
            v-for="nature in TIER_CREATE_NATURES"
            :key="nature"
            type="button"
            class="tier-nature-choice__item"
            role="listitem"
            @click="emit('select', nature)"
        >
            <span class="tier-nature-choice__icon" :class="`tier-nature-choice__icon--${nature}`">
                <component :is="TIER_NATURE_ICONS[nature]" :size="20" stroke-width="1.8" />
            </span>
            <span class="tier-nature-choice__copy">
                <span class="tier-nature-choice__title">{{ t(`tiersPage.createAs.${nature}`) }}</span>
                <span class="tier-nature-choice__hint">{{ t(`tiersPage.createHints.${nature}`) }}</span>
            </span>
        </button>
    </div>
</template>

<style scoped>
.tier-nature-choice {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tier-nature-choice__item {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--thread);
    border-radius: 14px;
    background: var(--surface-raised);
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        background 0.2s ease;
}

.tier-nature-choice__item:hover {
    border-color: rgba(var(--v-theme-primary), 0.4);
    background: rgba(var(--v-theme-primary), 0.06);
}

.tier-nature-choice__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tier-nature-choice__icon--person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-nature-choice__icon--organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-nature-choice__icon--administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-nature-choice__icon--unknown {
    background: var(--hair);
    color: var(--ink-muted);
}

.tier-nature-choice__copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.tier-nature-choice__title {
    font-size: 0.95rem;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.tier-nature-choice__hint {
    font-size: 0.78rem;
    color: var(--ink-muted);
}
</style>
