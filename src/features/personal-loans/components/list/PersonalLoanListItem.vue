<script setup lang="ts">
/**
 * Bloc prêt entre personnes : sens (je prête bleu / j’emprunte gris) et % remboursé, contrepartie 700, libellé,
 * jauge bleue 6 px, lignes restant / initial / échéance, « en retard » violet, état final en toutes lettres.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { formatCalendarDate, formatPercentRepaid, formatPersonalLoanAmount, personalLoanBarWidth } from '@/features/personal-loans/format';
import type { PersonalLoan } from '@/features/personal-loans/types';

const props = defineProps<{
    loan: PersonalLoan;
    acting?: boolean;
}>();

const emit = defineEmits<{
    open: [loan: PersonalLoan];
    edit: [loan: PersonalLoan];
    delete: [loan: PersonalLoan];
}>();

const { t, locale } = useI18n();

const money = (amount: number) => formatPersonalLoanAmount(amount, props.loan.currency, locale.value);

const percentText = computed(() => formatPercentRepaid(props.loan.percentRepaid, locale.value));
const barWidth = computed(() => personalLoanBarWidth(props.loan));
const directionText = computed(() => t(`personalLoansPage.directions.${props.loan.direction}`));
const counterpart = computed(() => props.loan.counterpartName?.trim() || t('personalLoansPage.list.unknownCounterpart'));
const labelText = computed(() => props.loan.label?.trim() || null);
const dueText = computed(() =>
    props.loan.plannedEndDate ? formatCalendarDate(props.loan.plannedEndDate, locale.value) : t('personalLoansPage.list.noDate')
);

const canceled = computed(() => props.loan.status === 'annule');
const overdue = computed(() => props.loan.isOverdue && props.loan.status === 'active');

/** Ligne d’état finale : en retard (violet), remboursé (bleu) ou annulé (gris). */
const status = computed(() => {
    if (canceled.value) return { text: t('personalLoansPage.badges.annule'), tone: '' };
    if (props.loan.status === 'rembourse') return { text: t('personalLoansPage.badges.rembourse'), tone: 'su-pos' };
    if (overdue.value) return { text: t('personalLoansPage.badges.overdue'), tone: 'su-over' };
    return null;
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.loan);
}
</script>

<template>
    <article
        class="loan-card"
        :class="{ 'loan-card--editable': !acting, 'is-annule': canceled }"
        :data-personal-loan-id="loan.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('open', loan)"
    >
        <div class="loan-card__head">
            <p class="loan-card__direction" :class="{ 'is-lent': loan.direction === 'pret' }">
                {{ directionText }} · {{ t('personalLoansPage.list.repaidPercent', { percent: percentText }) }}
            </p>
            <div class="loan-card__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu loan-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', loan)">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('personalLoansPage.actions.edit') }}</span>
                        </button>
                        <button
                            type="button"
                            class="su-menu-item loan-actions-menu__delete"
                            :disabled="acting"
                            @click="emit('delete', loan)"
                        >
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('personalLoansPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <h3 class="loan-card__name">{{ counterpart }}</h3>
        <p class="loan-card__sub">{{ labelText || t('personalLoansPage.list.noLabel') }}</p>
        <div class="su-gauge loan-card__gauge" role="img" :aria-label="percentText">
            <span class="su-gauge__fill su-gauge__fill--blue" :style="{ width: `${barWidth}%` }" />
        </div>
        <div class="su-kv su-kv--strong">
            <span>{{ t('personalLoansPage.card.remaining') }}</span
            ><span>{{ money(loan.remainingAmount) }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('personalLoansPage.card.initial') }}</span
            ><span>{{ money(loan.initialAmount) }}</span>
        </div>
        <div class="su-kv">
            <span>{{ t('personalLoansPage.card.plannedEndDate') }}</span
            ><span :class="{ 'su-over': overdue }">{{ dueText }}</span>
        </div>
        <p v-if="status" class="loan-card__status" :class="status.tone">{{ status.text }}</p>
    </article>
</template>

<style scoped>
/* bloc léger : bordure fine, pas d'ombre ; noircit au survol */
.loan-card {
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

.loan-card--editable {
    cursor: pointer;
}

.loan-card--editable:hover,
.loan-card:focus-within {
    border-color: var(--ink);
}

.loan-card:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.loan-card.is-annule > :not(.loan-card__head):not(.loan-card__status) {
    opacity: 0.55;
}

.loan-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
}

.loan-card__direction {
    margin: 0;
    min-width: 0;
    color: var(--gray);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.loan-card__direction.is-lent {
    color: var(--blue-ink);
}

.loan-card__actions {
    display: flex;
    margin: -4px -8px -4px 0;
}

@media (hover: hover) and (pointer: fine) {
    .loan-card__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .loan-card:hover .loan-card__actions,
    .loan-card:focus-within .loan-card__actions {
        opacity: 1;
    }
}

.loan-card__name {
    margin: 6px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.loan-card__sub {
    margin: 2px 0 14px;
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.loan-card__gauge {
    margin-bottom: 8px;
}

.loan-card > .su-kv:last-of-type {
    border-bottom: 1px solid var(--line);
}

.loan-card .su-kv .su-over {
    color: var(--violet-ink);
}

.loan-card__status {
    margin: 14px 0 0;
    color: var(--gray);
    font-size: 14px;
}

.loan-card__status.su-pos {
    color: var(--blue-ink);
}

.loan-card__status.su-over {
    color: var(--violet-ink);
}

.loan-actions-menu {
    width: min(260px, calc(100vw - 32px));
}

.loan-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.loan-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.loan-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}
</style>
