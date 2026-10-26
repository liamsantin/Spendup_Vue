<script setup lang="ts">
/**
 * Choix d’une nature de tiers : carré 36 px teinté + titre 700 + description grise.
 * `menu` = item du menu « + Ajouter » ; `panel` = ligne sur filet fin dans la modale de création.
 */
defineOptions({ name: 'TierNatureOption' });

import { useI18n } from 'vue-i18n';
import { TIER_NATURE_ICONS, tierNatureTileClass } from '@/features/tiers/natureUi';
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
    <button type="button" class="su-menu-item tier-nature-option" :class="`tier-nature-option--${variant}`" @click="emit('select')">
        <span class="tier-nature-option__icon" :class="tierNatureTileClass(nature)">
            <component :is="TIER_NATURE_ICONS[nature]" :size="18" stroke-width="1.7" />
        </span>
        <span class="tier-nature-option__copy">
            <span class="su-menu-item__title">{{ t(`tiersPage.createAs.${nature}`) }}</span>
            <span class="su-menu-item__desc">{{ t(`tiersPage.createHints.${nature}`) }}</span>
        </span>
    </button>
</template>

<style scoped>
.tier-nature-option__icon {
    flex: none;
}

.tier-nature-option__copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
}

.tier-nature-option--menu .su-menu-item__desc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* variante modale : lignes sur filet fin, pleine largeur */
.tier-nature-option--panel {
    padding: 12px 8px;
    border-top: 1px solid var(--line);
}

.tier-nature-option--panel:last-child {
    border-bottom: 1px solid var(--line);
}

.tier-nature-option:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}
</style>
