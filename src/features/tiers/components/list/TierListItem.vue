<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    BuildingBankIcon,
    BuildingCommunityIcon,
    BuildingIcon,
    HelpCircleIcon,
    MailIcon,
    PencilIcon,
    PhoneIcon,
    TrashIcon,
    UserIcon,
    WorldIcon
} from 'vue-tabler-icons';
import type { Tier, TierNature } from '@/features/tiers/types';

const props = defineProps<{
    tier: Tier;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [tier: Tier];
    delete: [tier: Tier];
}>();

const { t } = useI18n();

const natureIcon = computed(() => {
    const map: Record<TierNature, typeof UserIcon> = {
        person: UserIcon,
        company: BuildingIcon,
        organization: BuildingCommunityIcon,
        administration: BuildingBankIcon,
        unknown: HelpCircleIcon
    };
    return map[props.tier.nature] ?? HelpCircleIcon;
});

const natureLabel = computed(() => t(`tiersPage.natures.${props.tier.nature}`));

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
</script>

<template>
    <div class="tier-row" :class="{ 'tier-row--editable': !acting }" :data-tier-id="tier.publicId" @dblclick="onDoubleClick">
        <span class="tier-row__icon" :class="`tier-row__icon--${tier.nature}`">
            <component :is="natureIcon" size="18" stroke-width="1.8" />
        </span>

        <div class="tier-row__meta">
            <div class="tier-row__title">
                <p class="tier-row__name">{{ tier.name }}</p>
                <span class="tier-row__badge" :class="`is-${tier.nature}`">{{ natureLabel }}</span>
            </div>
            <p v-if="detailLine" class="tier-row__sub">{{ detailLine }}</p>
            <div class="tier-row__roles">
                <span v-for="role in tier.roles" :key="role" class="tier-row__role">{{ t(`tiersPage.roles.${role}`) }}</span>
                <span v-if="!tier.roles.length" class="tier-row__role tier-row__role--empty">{{ t('tiersPage.list.noRoles') }}</span>
            </div>
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

        <div class="tier-row__actions">
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('tiersPage.actions.edit')"
                @click.stop="emit('edit', tier)"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('tiersPage.actions.delete')"
                @click.stop="emit('delete', tier)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.tier-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 10px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    transition: background 0.2s ease;
}

.tier-row--editable {
    cursor: pointer;
}

.tier-row:hover {
    background: var(--surface-hover-soft);
}

.tier-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tier-row__icon--person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-row__icon--organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-row__icon--administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-row__icon--unknown {
    background: var(--hair);
    color: var(--ink-muted);
}

.tier-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.tier-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.tier-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-row__badge {
    flex: none;
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.2;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tier-row__badge.is-person {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.tier-row__badge.is-organization {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.tier-row__badge.is-administration {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.tier-row__badge.is-unknown {
    background: var(--hair);
    color: var(--ink-muted);
}

.tier-row__sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tier-row__roles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.tier-row__role {
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--thread);
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-muted);
    background: var(--surface-raised);
}

.tier-row__role--empty {
    border-style: dashed;
    font-weight: 500;
}

.tier-row__contact {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.76rem;
    color: var(--ink-muted);
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
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;
}

.tier-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

@media (max-width: 600px) {
    .tier-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .tier-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 46px;
    }
}
</style>
