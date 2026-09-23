<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
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
        return new URL(raw).hostname.replace(/^www\./, '');
    } catch {
        return raw;
    }
});

function onDoubleClick(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('edit', props.tier);
}
</script>

<template>
    <tr class="tier-table__row" :data-tier-id="tier.publicId" @dblclick="onDoubleClick">
        <td>
            <div class="tier-table__name">
                <span class="tier-table__icon" :class="`is-${tier.nature}`">
                    <component :is="natureIcon" size="16" stroke-width="1.8" />
                </span>
                <span class="tier-table__identity">
                    <span class="tier-table__title">{{ tier.name }}</span>
                    <span v-if="detailLine" class="tier-table__sub">{{ detailLine }}</span>
                </span>
            </div>
        </td>
        <td>
            <span v-if="rolesLabel" class="tier-table__text">{{ rolesLabel }}</span>
            <span v-else class="tier-table__empty">{{ t('tiersPage.list.noRoles') }}</span>
        </td>
        <td>
            <a v-if="tier.email" :href="`mailto:${tier.email}`" class="tier-table__link" @click.stop>{{ tier.email }}</a>
            <span v-else class="tier-table__empty">—</span>
        </td>
        <td>
            <a v-if="tier.phone" :href="`tel:${tier.phone.replace(/[^\d+]/g, '')}`" class="tier-table__link" @click.stop>{{ tier.phone }}</a>
            <span v-else class="tier-table__empty">—</span>
        </td>
        <td>
            <a v-if="tier.website && websiteLabel" :href="tier.website" target="_blank" rel="noopener noreferrer" class="tier-table__link" @click.stop>
                {{ websiteLabel }}
            </a>
            <span v-else class="tier-table__empty">—</span>
        </td>
        <td>
            <span class="tier-table__badge" :class="`is-${tier.nature}`" :title="natureLabel">
                <span class="tier-table__badge-label">{{ natureLabel }}</span>
            </span>
        </td>
        <td class="tier-table__actions-cell" @click.stop>
            <div class="tier-table__actions">
                <button type="button" class="su-orb" :disabled="acting" :aria-label="t('tiersPage.actions.edit')" @click="emit('edit', tier)">
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
        </td>
    </tr>
</template>

<style scoped>
.tier-table__row {
    --row: transparent;
}

.tier-table__row td {
    height: 58px;
    padding: 10px 16px;
    background: var(--row);
    vertical-align: middle;
    font-size: 0.86rem;
    color: var(--ink);
    transition: background 0.22s var(--ease, ease);
}

.tier-table__row td:first-child {
    border-radius: 16px 0 0 16px;
    padding-left: 18px;
}

.tier-table__row td:last-child {
    border-radius: 0 16px 16px 0;
    padding-right: 12px;
}

@media (hover: hover) and (pointer: fine) {
    .tier-table__row:hover {
        --row: rgba(16, 16, 20, 0.055);
        cursor: pointer;
    }
}

.tier-table__name {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.tier-table__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tier-table__icon.is-person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-table__icon.is-organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-table__icon.is-administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-table__icon.is-unknown {
    background: var(--hair);
    color: var(--ink-muted);
}

.tier-table__identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
}

.tier-table__title {
    font-size: 0.88rem;
    font-weight: 560;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-table__sub,
.tier-table__empty {
    color: #8a8172;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-table__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 600;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    white-space: nowrap;
    max-width: 100%;
}

.tier-table__badge-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-table__badge::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.tier-table__badge.is-person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-table__badge.is-organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-table__badge.is-administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-table__badge.is-unknown {
    background: var(--hair);
    color: var(--ink-muted);
}

.tier-table__text {
    white-space: nowrap;
}

.tier-table__link {
    color: inherit;
    text-decoration: none;
    white-space: nowrap;
}

.tier-table__link:hover {
    text-decoration: underline;
}

.tier-table__row td.tier-table__actions-cell {
    padding-left: 4px;
}

.tier-table__actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.18s var(--ease, ease);
}

.tier-table__row:hover .tier-table__actions,
.tier-table__row:focus-within .tier-table__actions {
    opacity: 1;
}
</style>
