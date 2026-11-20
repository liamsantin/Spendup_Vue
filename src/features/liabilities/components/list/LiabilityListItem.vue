<script setup lang="ts">
/**
 * Bloc passif : pourcentage remboursé gris, nom 700, prêteur · type, jauge bleue 6 px,
 * lignes restant / initial / taux / échéance, mention de l’actif financé, état final en toutes lettres.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, ProgressCheckIcon, TrashIcon } from 'vue-tabler-icons';
import {
    formatCalendarDate,
    formatInterestRate,
    formatLiabilityAmount,
    formatPercentRepaid,
    liabilityBarWidth
} from '@/features/liabilities/format';
import type { Liability } from '@/features/liabilities/types';

const props = defineProps<{
    liability: Liability;
    acting?: boolean;
    /** Nom de l’actif financé (résolu par le parent), `null` si inconnu. */
    assetName?: string | null;
}>();

const emit = defineEmits<{
    open: [liability: Liability];
    edit: [liability: Liability];
    remaining: [liability: Liability];
    delete: [liability: Liability];
}>();

const { t, locale } = useI18n();

const money = (amount: number) => formatLiabilityAmount(amount, props.liability.currency, locale.value);

const percentText = computed(() => formatPercentRepaid(props.liability.percentRepaid, locale.value));
const barWidth = computed(() => liabilityBarWidth(props.liability));
const remainingText = computed(() => money(props.liability.remainingAmount));
const initialText = computed(() => money(props.liability.initialAmount));
const rateText = computed(() =>
    props.liability.interestRate == null ? t('common.emptyValue') : formatInterestRate(props.liability.interestRate, locale.value)
);
const dueText = computed(() =>
    props.liability.plannedEndDate ? formatCalendarDate(props.liability.plannedEndDate, locale.value) : t('liabilitiesPage.list.noDate')
);
const subline = computed(() => {
    const type = t(`liabilitiesPage.types.${props.liability.type}`);
    const lender = props.liability.lenderTierName?.trim();
    return lender ? `${lender} · ${type}` : type;
});
const assetText = computed(() => {
    if (!props.liability.assetPublicId) return null;
    return t('liabilitiesPage.list.financedAsset', { name: props.assetName ?? t('liabilitiesPage.list.unknownAsset') });
});

const repaid = computed(() => props.liability.status === 'rembourse');
const canceled = computed(() => props.liability.status === 'annule');

/** Ligne d’état finale : remboursé (bleu) ou annulé (gris). */
const status = computed(() => {
    if (canceled.value) return { text: t('liabilitiesPage.badges.annule'), tone: '' };
    if (repaid.value) return { text: t('liabilitiesPage.badges.rembourse'), tone: 'su-pos' };
    return null;
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.liability);
}
</script>

<template>
    <article
        class="liability-card"
        :class="{ 'liability-card--editable': !acting, 'is-annule': canceled }"
        :data-liability-id="liability.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('open', liability)"
    >
        <div class="liability-card__head">
            <p class="liability-card__percent">{{ t('liabilitiesPage.list.repaidPercent', { percent: percentText }) }}</p>
            <div class="liability-card__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu liability-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', liability)">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('liabilitiesPage.actions.edit') }}</span>
                        </button>
                        <button type="button" class="su-menu-item" :disabled="acting || canceled" @click="emit('remaining', liability)">
                            <span class="su-menu-item__icon"><ProgressCheckIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('liabilitiesPage.actions.updateRemaining') }}</span>
                        </button>
                        <button
                            type="button"
                            class="su-menu-item liability-actions-menu__delete"
                            :disabled="acting"
                            @click="emit('delete', liability)"
                        >
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('liabilitiesPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <h3 class="liability-card__name">{{ liability.name }}</h3>
        <p class="liability-card__sub">{{ subline }}</p>
        <div class="su-gauge liability-card__gauge" role="img" :aria-label="percentText">
            <span class="su-gauge__fill su-gauge__fill--blue" :style="{ width: `${barWidth}%` }" />
        </div>
        <div class="su-kv su-kv--strong">
            <span>{{ t('liabilitiesPage.card.remaining') }}</span
            ><span>{{ remainingText }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('liabilitiesPage.card.initial') }}</span
            ><span>{{ initialText }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('liabilitiesPage.card.interestRate') }}</span
            ><span>{{ rateText }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('liabilitiesPage.card.plannedEndDate') }}</span
            ><span>{{ dueText }}</span>
        </div>
        <p v-if="assetText" class="liability-card__asset">{{ assetText }}</p>
        <p v-if="status" class="liability-card__status" :class="status.tone">{{ status.text }}</p>
    </article>
</template>

<style scoped>
/* bloc léger : bordure fine, pas d'ombre ; noircit au survol */
.liability-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 18px 20px 16px;
    border: 1px solid var(--line);
    background: var(--bg);
    transition: border-color 0.15s var(--ease);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.liability-card--editable {
    cursor: pointer;
}

.liability-card--editable:hover,
.liability-card:focus-within {
    border-color: var(--ink);
}

.liability-card:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.liability-card.is-annule > :not(.liability-card__head):not(.liability-card__status) {
    opacity: 0.55;
}

.liability-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
}

.liability-card__percent {
    margin: 0;
    color: var(--gray);
    font-size: 16px;
}

.liability-card__actions {
    display: flex;
    margin: -4px -8px -4px 0;
}

@media (hover: hover) and (pointer: fine) {
    .liability-card__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .liability-card:hover .liability-card__actions,
    .liability-card:focus-within .liability-card__actions {
        opacity: 1;
    }
}

.liability-card__name {
    margin: 6px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.liability-card__sub {
    margin: 2px 0 14px;
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.liability-card__gauge {
    margin-bottom: 8px;
}

.liability-card > .su-kv:last-of-type {
    border-bottom: 1px solid var(--line);
}

.liability-card__asset {
    margin: 12px 0 0;
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.liability-card__status {
    margin: 14px 0 0;
    color: var(--gray);
    font-size: 14px;
}

.liability-card__status.su-pos {
    color: var(--blue-ink);
}

.liability-actions-menu {
    width: min(260px, calc(100vw - 32px));
}

.liability-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.liability-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.liability-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}
</style>
