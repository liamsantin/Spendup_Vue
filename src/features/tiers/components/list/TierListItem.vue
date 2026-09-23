<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MailIcon, PencilIcon, PhoneIcon, TrashIcon, WorldIcon, DotsVerticalIcon } from 'vue-tabler-icons';
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
</script>

<template>
    <div
        class="tier-row"
        :class="{ 'tier-row--editable': !acting }"
        :data-tier-id="tier.publicId"
        @click="onActivate"
        @dblclick="onDoubleClick"
    >
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
                        <DotsVerticalIcon size="18" stroke-width="1.75" />
                    </button>
                </template>
                <v-sheet class="su-menu tier-actions-menu">
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="emit('edit', tier)">
                        <PencilIcon :size="16" stroke-width="1.6" />
                        {{ t('tiersPage.actions.edit') }}
                    </button>
                    <button type="button" class="tier-actions-menu__delete" :disabled="acting" @click="emit('delete', tier)">
                        {{ t('tiersPage.actions.delete') }}
                    </button>
                </v-sheet>
            </v-menu>
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
    padding: 13px 10px 14px;
    box-sizing: border-box;
    color: inherit;
    position: relative;
    border-radius: 18px;
    transition: background 0.3s var(--ease);
}

.tier-row::after {
    content: '';
    position: absolute;
    left: 62px;
    right: 12px;
    bottom: 0;
    height: 1px;
    background: color-mix(in srgb, var(--ink) 14%, transparent);
    pointer-events: none;
}

.tier-row--editable {
    cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
    .tier-row:hover {
        background: rgba(16, 16, 20, 0.035);
    }

    .tier-row:hover::after {
        opacity: 0;
    }
}

.tier-row:last-child::after {
    content: none;
}

@media (prefers-reduced-motion: reduce) {
    .tier-row {
        transition: none;
    }
}

.tier-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 14px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
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
    font-family: var(--font-heading);
    font-size: 15.5px;
    font-weight: 650;
    letter-spacing: -0.02em;
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
    align-items: flex-start;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

.tier-row__orbs {
    display: flex;
    align-items: center;
    gap: 4px;
}

.tier-row__more {
    display: none;
}

.tier-actions-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(176px, calc(100vw - 32px));
    padding: 12px !important;
}

.tier-actions-menu .su-btn {
    width: 100%;
}

.tier-actions-menu__delete {
    appearance: none;
    display: block;
    width: 100%;
    margin: 2px 0 0;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: #e11d48;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.3;
    text-align: center;
    cursor: pointer;
    transition: transform 0.18s var(--ease, ease);
}

.tier-actions-menu__delete:disabled {
    opacity: 0.45;
    cursor: default;
}

.tier-actions-menu__delete:hover:not(:disabled) {
    color: #be123c;
    transform: scale(1.06);
}

@media (max-width: 767px) {
    .tier-row {
        gap: 10px;
        padding: 14px 8px 15px;
        border-radius: 16px;
    }

    .tier-row::after {
        left: 56px;
        right: 10px;
    }

    .tier-row__orbs {
        display: none;
    }

    .tier-row__more {
        display: grid;
    }
}
</style>
