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
    <tr class="app-data-table__row tier-table__row" :class="`is-${tier.nature}`" :data-tier-id="tier.publicId" @dblclick="onDoubleClick">
        <td>
            <div class="app-data-table__name">
                <span class="app-data-table__avatar">
                    <component :is="natureIcon" size="16" stroke-width="1.8" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ tier.name }}</span>
                    <span v-if="detailLine" class="app-data-table__muted">{{ detailLine }}</span>
                </span>
            </div>
        </td>
        <td>
            <span v-if="rolesLabel">{{ rolesLabel }}</span>
            <span v-else class="app-data-table__muted">{{ t('tiersPage.list.noRoles') }}</span>
        </td>
        <td>
            <a v-if="tier.email" :href="`mailto:${tier.email}`" class="tier-table__link" @click.stop>{{ tier.email }}</a>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <a v-if="tier.phone" :href="`tel:${tier.phone.replace(/[^\d+]/g, '')}`" class="tier-table__link" @click.stop>{{
                tier.phone
            }}</a>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <a
                v-if="tier.website && websiteLabel"
                :href="tier.website"
                target="_blank"
                rel="noopener noreferrer"
                class="tier-table__link"
                @click.stop
            >
                {{ websiteLabel }}
            </a>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span class="app-data-table__pill" :title="natureLabel">
                <span class="app-data-table__pill-label">{{ natureLabel }}</span>
            </span>
        </td>
        <td class="app-data-table__actions-cell" @click.stop>
            <div class="app-data-table__actions">
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
        </td>
    </tr>
</template>

<style scoped>
.tier-table__row.is-person {
    --tint: rgb(var(--v-theme-success));
}

.tier-table__row.is-organization {
    --tint: rgb(var(--v-theme-secondary));
}

.tier-table__row.is-administration {
    --tint: rgb(var(--v-theme-warning));
}

.tier-table__row.is-unknown {
    --tint: var(--ink-muted);
}

.tier-table__link {
    color: inherit;
    text-decoration: none;
}

.tier-table__link:hover {
    text-decoration: underline;
}
</style>
