<script setup lang="ts">
defineOptions({ name: 'TierNatureOption' });

import { ChevronRightIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import { TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';

withDefaults(
    defineProps<{
        nature: TierNature;
        variant?: 'menu' | 'panel';
    }>(),
    { variant: 'panel' }
);

const emit = defineEmits<{
    select: [];
}>();

const { t } = useI18n();
</script>

<template>
    <button
        type="button"
        class="tier-nature-option"
        :class="[`tier-nature-option--${nature}`, `tier-nature-option--${variant}`]"
        @click="emit('select')"
    >
        <span class="tier-nature-option__icon">
            <component :is="TIER_NATURE_ICONS[nature]" :size="variant === 'menu' ? 18 : 20" stroke-width="1.75" />
        </span>
        <span class="tier-nature-option__copy">
            <span class="tier-nature-option__title">{{ t(`tiersPage.createAs.${nature}`) }}</span>
            <span class="tier-nature-option__hint">{{ t(`tiersPage.createHints.${nature}`) }}</span>
        </span>
        <ChevronRightIcon class="tier-nature-option__chevron" :size="16" stroke-width="1.8" />
    </button>
</template>

<style scoped>
.tier-nature-option {
    --nature-tint: rgb(var(--v-theme-primary));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.22s var(--ease, ease),
        transform 0.22s var(--ease, ease),
        box-shadow 0.22s var(--ease, ease),
        border-color 0.22s var(--ease, ease);
}

.tier-nature-option--person {
    --nature-tint: rgb(var(--v-theme-success));
}

.tier-nature-option--organization {
    --nature-tint: rgb(var(--v-theme-secondary));
}

.tier-nature-option--administration {
    --nature-tint: rgb(var(--v-theme-warning));
}

.tier-nature-option--unknown {
    --nature-tint: var(--ink-muted);
}

.tier-nature-option--menu {
    padding: 9px 10px 9px 8px;
    border-radius: 16px;
}

.tier-nature-option--panel {
    padding: 13px 14px;
    border: 1px solid var(--thread);
    border-radius: 18px;
    background: var(--surface-raised);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.tier-nature-option:hover,
.tier-nature-option:focus-visible {
    background: color-mix(in srgb, var(--nature-tint) 11%, var(--surface-raised));
}

.tier-nature-option--panel:hover,
.tier-nature-option--panel:focus-visible {
    border-color: color-mix(in srgb, var(--nature-tint) 45%, var(--thread));
    box-shadow:
        0 10px 22px -16px color-mix(in srgb, var(--nature-tint) 55%, transparent),
        0 0 0 2px color-mix(in srgb, var(--nature-tint) 35%, transparent);
    transform: translateY(-1px);
}

.tier-nature-option:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--nature-tint) 55%, transparent);
}

.tier-nature-option__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 58%),
        color-mix(in srgb, var(--nature-tint) 16%, var(--surface-raised));
    color: var(--nature-tint);
    box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.8) inset,
        0 6px 14px -10px color-mix(in srgb, var(--nature-tint) 70%, transparent);
}

.tier-nature-option--menu .tier-nature-option__icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
}

.tier-nature-option__copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1 1 auto;
}

.tier-nature-option__title {
    font-family: var(--font-heading);
    font-size: 0.94rem;
    font-weight: 680;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: var(--ink);
}

.tier-nature-option__hint {
    font-size: 0.75rem;
    font-weight: 450;
    line-height: 1.35;
    color: var(--ink-muted);
}

.tier-nature-option--menu .tier-nature-option__hint {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-nature-option__chevron {
    flex: none;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateX(-4px);
    transition:
        opacity 0.2s ease,
        transform 0.2s var(--ease, ease),
        color 0.2s ease;
}

.tier-nature-option:hover .tier-nature-option__chevron,
.tier-nature-option:focus-visible .tier-nature-option__chevron {
    opacity: 0.85;
    transform: translateX(0);
    color: var(--nature-tint);
}
</style>
