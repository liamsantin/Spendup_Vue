<script setup lang="ts">
/**
 * Ligne de tiers (téléphone) : carré 36 px teinté | nom 700 + sous-lignes grises | actions.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MailIcon, PencilIcon, PhoneIcon, TrashIcon, WorldIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { useRowTap } from '@/components/shared/board/useRowTap';
import { TIER_NATURE_ICONS, tierNatureTileClass } from '@/features/tiers/natureUi';
import type { Tier } from '@/features/tiers/types';

const props = defineProps<{
    tier: Tier;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [tier: Tier];
    delete: [tier: Tier];
}>();

const { t } = useI18n();

const natureIcon = computed(() => TIER_NATURE_ICONS[props.tier.nature]);
const natureLabel = computed(() => t(`tiersPage.natures.${props.tier.nature}`));
const tileClass = computed(() => tierNatureTileClass(props.tier.nature));
const rolesLabel = computed(() => props.tier.roles.map((role) => t(`tiersPage.roles.${role}`)).join(', '));

const detailLine = computed(() => {
    const tier = props.tier;
    if (tier.nature === 'person' && tier.person) {
        const full = [tier.person.firstName, tier.person.lastName].filter(Boolean).join(' ').trim();
        return full && full.toLowerCase() !== tier.name.trim().toLowerCase() ? full : null;
    }
    if (tier.nature === 'company' && tier.company?.legalName) {
        return tier.company.legalName.trim().toLowerCase() !== tier.name.trim().toLowerCase() ? tier.company.legalName : null;
    }
    if (tier.nature === 'organization' && tier.organization) {
        const parts = [tier.organization.officialName, tier.organization.organizationType].filter(Boolean);
        return parts.length ? parts.join(' · ') : null;
    }
    return null;
});

const websiteLabel = computed(() => {
    const raw = props.tier.website;
    if (!raw) return null;
    try {
        const url = new URL(raw);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return raw;
    }
});

function onDoubleClick(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('edit', props.tier);
}

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    emit('edit', props.tier);
}

const tap = useRowTap(
    () => emit('edit', props.tier),
    () => !props.acting
);
</script>

<template>
    <div
        class="tier-row"
        :class="[`is-${tier.nature}`, { 'tier-row--editable': !acting }]"
        :data-tier-id="tier.publicId"
        @click="onActivate"
        @dblclick="onDoubleClick"
        @touchstart.passive="tap.onTouchstart"
        @touchend="tap.onTouchend"
        @touchcancel="tap.onTouchcancel"
    >
        <span class="tier-row__tile" :class="tileClass" aria-hidden="true">
            <component :is="natureIcon" :size="18" stroke-width="1.7" />
        </span>

        <div class="tier-row__meta">
            <p class="tier-row__name">{{ tier.name }}</p>
            <p v-if="detailLine" class="tier-row__sub">{{ detailLine }}</p>
            <p class="tier-row__sub tier-row__type">
                <span class="su-sq" aria-hidden="true" />
                <span>{{ natureLabel }}</span>
                <span v-if="rolesLabel">· {{ rolesLabel }}</span>
                <span v-else>· {{ t('tiersPage.list.noRoles') }}</span>
            </p>
            <p v-if="tier.email || tier.phone || websiteLabel" class="tier-row__contact">
                <a v-if="tier.email" :href="`mailto:${tier.email}`" class="tier-row__contact-item" @click.stop>
                    <MailIcon :size="13" stroke-width="1.8" />
                    <span class="text-truncate">{{ tier.email }}</span>
                </a>
                <a v-if="tier.phone" :href="`tel:${tier.phone.replace(/[^\d+]/g, '')}`" class="tier-row__contact-item" @click.stop>
                    <PhoneIcon :size="13" stroke-width="1.8" />
                    <span class="text-truncate">{{ tier.phone }}</span>
                </a>
                <a
                    v-if="tier.website && websiteLabel"
                    :href="tier.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tier-row__contact-item"
                    @click.stop
                >
                    <WorldIcon :size="13" stroke-width="1.8" />
                    <span class="text-truncate">{{ websiteLabel }}</span>
                </a>
            </p>
        </div>

        <div class="tier-row__actions" @click.stop>
            <div class="tier-row__orbs">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('tiersPage.actions.edit')"
                    @click="emit('edit', tier)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('tiersPage.actions.delete')"
                    @click="emit('delete', tier)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
            <v-menu location="bottom end" :offset="8">
                <template #activator="{ props: menuProps }">
                    <button
                        v-bind="menuProps"
                        type="button"
                        class="su-orb tier-row__more"
                        :disabled="acting"
                        :aria-label="t('common.more')"
                    >
                        <DotsVerticalIcon :size="18" stroke-width="1.7" />
                    </button>
                </template>
                <v-sheet elevation="0" class="su-menu tier-actions-menu">
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="emit('edit', tier)">
                        <PencilIcon :size="16" stroke-width="1.6" />
                        {{ t('tiersPage.actions.edit') }}
                    </button>
                    <button type="button" class="su-btn su-btn--danger" :disabled="acting" @click="emit('delete', tier)">
                        <TrashIcon :size="16" stroke-width="1.6" />
                        {{ t('tiersPage.actions.delete') }}
                    </button>
                </v-sheet>
            </v-menu>
        </div>
    </div>
</template>

<style scoped>
/* ligne sur filet fin : 36 px | nom + sous-lignes | actions */
.tier-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    width: 100%;
    min-width: 0;
    min-height: 56px;
    padding: 12px 8px;
    box-sizing: border-box;
    border-top: 1px solid var(--line);
    color: inherit;
    transition: background 0.15s var(--ease);
}

.tier-row:last-child {
    border-bottom: 1px solid var(--line);
}

/* couleur du petit carré de type */
.tier-row.is-person {
    --sq-color: var(--t-teal-ink);
}

.tier-row.is-company {
    --sq-color: var(--t-blue-ink);
}

.tier-row.is-organization {
    --sq-color: var(--t-violet-ink);
}

.tier-row.is-administration {
    --sq-color: var(--t-amber-ink);
}

.tier-row.is-unknown {
    --sq-color: var(--t-gray-ink);
}

.tier-row--editable {
    cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
    .tier-row:hover {
        background: var(--soft);
    }
}

@media (prefers-reduced-motion: reduce) {
    .tier-row {
        transition: none;
    }
}

.tier-row__tile {
    flex: none;
}

.tier-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tier-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.006em;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-row__sub {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-row__type {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.tier-row__type > span:not(.su-sq) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-row__contact {
    margin: 2px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 13px;
    color: var(--gray);
}

.tier-row__contact-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
    color: inherit;
    text-decoration: none;
}

.tier-row__contact-item:hover {
    color: var(--blue-ink);
    text-decoration: underline;
}

.tier-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
}

.tier-row__orbs {
    display: flex;
    align-items: center;
    gap: 2px;
}

.tier-row__more {
    display: none;
}

.tier-actions-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(200px, calc(100vw - 32px));
}

.tier-actions-menu .su-btn {
    width: 100%;
    justify-content: flex-start;
}

@media (max-width: 767px) {
    .tier-row {
        padding: 12px 0;
    }

    .tier-row__orbs {
        display: none;
    }

    .tier-row__more {
        display: grid;
    }
}
</style>
