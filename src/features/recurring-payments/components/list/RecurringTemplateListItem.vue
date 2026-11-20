<script setup lang="ts">
/**
 * Ligne de récurrence (maquette 05) : carré 36 px teinté | nom 700 + sous-ligne grise |
 * « Mensuel · le 25 » | « Prochaine 25.11 » | montant 700 à droite | actions au survol.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { dayOfYmd, formatShortDayMonth, formatSignedPlannedAmount, isExpenseTemplate } from '@/features/recurring-payments/format';
import { recurringTypeVisual } from '@/features/recurring-payments/components/list/recurring-icons';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';
import TagChips from '@/features/tags/components/list/TagChips.vue';

const props = withDefaults(
    defineProps<{
        template: RecurringExpense | RecurringIncome;
        kind: RecurringKind;
        canWrite: boolean;
        acting?: boolean;
        showKind?: boolean;
    }>(),
    { acting: false, showKind: false }
);

const emit = defineEmits<{
    open: [template: RecurringExpense | RecurringIncome];
    edit: [template: RecurringExpense | RecurringIncome];
    delete: [template: RecurringExpense | RecurringIncome];
}>();

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();

const accountName = computed(
    () =>
        accountsStore.accounts.find((item) => item.publicId === props.template.accountPublicId)?.name ?? t('recurrencesPage.unknownAccount')
);

const typeLabel = computed(() => {
    if (isExpenseTemplate(props.template)) return t(`recurrencesPage.expenseTypes.${props.template.expenseType}`);
    return t(`recurrencesPage.incomeTypes.${props.template.incomeType}`);
});

const visual = computed(() =>
    recurringTypeVisual(props.kind, isExpenseTemplate(props.template) ? props.template.expenseType : props.template.incomeType)
);

const frequencyLabel = computed(() =>
    props.kind === 'expense'
        ? t(`recurrencesPage.expenseFrequencies.${props.template.frequency}`)
        : t(`recurrencesPage.incomeFrequencies.${props.template.frequency}`)
);

/** « Mensuel · le 25 » : jour de paiement du revenu, sinon jour de la prochaine échéance. */
const scheduleLabel = computed(() => {
    const day = (!isExpenseTemplate(props.template) ? props.template.paymentDay : null) ?? dayOfYmd(props.template.nextDueDate);
    return day ? `${frequencyLabel.value} · ${t('recurrencesPage.row.onDay', { day })}` : frequencyLabel.value;
});

const nextLabel = computed(() =>
    props.template.nextDueDate
        ? t('recurrencesPage.row.next', { date: formatShortDayMonth(props.template.nextDueDate, locale.value) })
        : t('recurrencesPage.list.noNextDue')
);

const amountLabel = computed(() =>
    formatSignedPlannedAmount(props.template.plannedAmount, props.kind, props.template.currency, locale.value)
);

const subLabel = computed(() => {
    const parts = [typeLabel.value, accountName.value];
    if (!props.template.isActive) parts.push(t('recurrencesPage.badges.paused'));
    return parts.join(' · ');
});

function onActivate(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.template);
}
</script>

<template>
    <div
        class="recurring-row"
        :class="[`is-${kind}`, { 'is-paused': !template.isActive }]"
        :data-recurring-id="template.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('open', template)"
    >
        <span class="su-tile recurring-row__tile" :class="`su-tile--${visual.tone}`" aria-hidden="true">
            <component :is="visual.icon" :size="18" stroke-width="1.7" />
        </span>
        <div class="recurring-row__meta">
            <p class="recurring-row__name">{{ template.name }}</p>
            <p class="recurring-row__sub">
                <span>{{ subLabel }}</span>
                <TagChips v-if="isExpenseTemplate(template)" :tag-public-ids="template.tagPublicIds" compact class="recurring-row__tags" />
            </p>
        </div>
        <span class="recurring-row__schedule">
            {{ scheduleLabel }}<span class="recurring-row__next-inline"> · {{ nextLabel }}</span>
        </span>
        <span class="recurring-row__next">{{ nextLabel }}</span>
        <span class="recurring-row__amount" :class="kind === 'income' ? 'su-pos' : 'su-neg'">{{ amountLabel }}</span>
        <div class="recurring-row__actions" @click.stop>
            <template v-if="canWrite">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('recurrencesPage.actions.edit')"
                    @click="emit('edit', template)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('recurrencesPage.actions.delete')"
                    @click="emit('delete', template)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* Ligne éditoriale : grille 36px | nom | fréquence | prochaine | montant | actions, filet fin au-dessus. */
.recurring-row {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 0.7fr) 132px 84px;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 56px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background 0.15s var(--ease);
}

.recurring-row:hover {
    background: var(--soft);
}

.recurring-row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.recurring-row.is-paused > :not(.recurring-row__actions) {
    opacity: 0.55;
}

.recurring-row__tile {
    margin-left: 8px;
}

.recurring-row__meta {
    min-width: 0;
}

.recurring-row__name {
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.006em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__sub {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__sub > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__tags {
    flex: none;
}

.recurring-row__schedule,
.recurring-row__next {
    min-width: 0;
    color: var(--gray);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recurring-row__next-inline {
    display: none;
}

.recurring-row__amount {
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
}

.recurring-row__actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    padding-right: 4px;
}

@media (hover: hover) and (pointer: fine) {
    .recurring-row__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .recurring-row:hover .recurring-row__actions,
    .recurring-row:focus-within .recurring-row__actions {
        opacity: 1;
    }
}

@media (max-width: 959.98px) {
    .recurring-row {
        grid-template-columns: 36px minmax(0, 1fr) 120px 84px;
        grid-template-areas:
            'tile meta amount actions'
            'tile schedule schedule actions';
        row-gap: 2px;
    }

    .recurring-row__tile {
        grid-area: tile;
        align-self: start;
    }

    .recurring-row__meta {
        grid-area: meta;
    }

    .recurring-row__amount {
        grid-area: amount;
        align-self: start;
    }

    .recurring-row__actions {
        grid-area: actions;
    }

    .recurring-row__schedule {
        grid-area: schedule;
        font-size: 13px;
    }

    .recurring-row__next {
        display: none;
    }

    .recurring-row__next-inline {
        display: inline;
    }
}

/* mobile : deux lignes seulement — nom | montant, puis fréquence · prochaine | actions */
@media (max-width: 599.98px) {
    .recurring-row {
        grid-template-columns: 36px minmax(0, 1fr) auto;
        grid-template-areas:
            'tile meta amount'
            'tile schedule actions';
        gap: 2px 12px;
        padding: 10px 0;
    }

    .recurring-row__tile {
        margin-left: 0;
        align-self: center;
    }

    /* type · compte : déjà porté par le groupe et le détail, on l'enlève pour gagner une ligne */
    .recurring-row__sub {
        display: none;
    }

    .recurring-row__actions {
        justify-content: flex-end;
        gap: 0;
        padding: 0;
        margin-right: -6px;
    }

    .recurring-row__actions :deep(.su-orb) {
        width: 32px;
        height: 28px;
    }

    .recurring-row__actions:empty {
        display: none;
    }

    .recurring-row:hover {
        background: transparent;
    }
}
</style>
