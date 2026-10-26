<script setup lang="ts">
/**
 * Échéances façon horaire (maquette 02) : par jour, filet 2 px, colonne gauche 132 px
 * (numéro du jour 48 px 700, jour de la semaine, N échéances, total) et lignes à droite.
 * Tri par nom ou montant : liste à plat, la date passant en sous-ligne.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    displayDueStatus,
    formatCalendarDate,
    formatSignedPlannedAmount,
    isDueSettled,
    type UpcomingDueSort
} from '@/features/recurring-payments/format';
import { recurringTypeVisual } from '@/features/recurring-payments/components/list/recurring-icons';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringUpcomingRow } from '@/features/recurring-payments/types';

const props = defineProps<{
    rows: RecurringUpcomingRow[];
    sort: UpcomingDueSort;
    accountName: (accountPublicId: string) => string;
}>();

const emit = defineEmits<{
    open: [row: RecurringUpcomingRow];
    sort: [value: UpcomingDueSort];
}>();

const { t, locale } = useI18n();
const store = useRecurringPaymentsStore();

const byDay = computed(() => props.sort === 'dateAsc' || props.sort === 'dateDesc');

type Day = { key: string; dayNumber: string; weekday: string; rows: RecurringUpcomingRow[]; total: string; totalTone: string };

function parseYmd(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

const days = computed<Day[]>(() => {
    const groups = new Map<string, RecurringUpcomingRow[]>();
    for (const row of props.rows) {
        const key = row.due.scheduledAt.slice(0, 10);
        const bucket = groups.get(key) ?? [];
        bucket.push(row);
        groups.set(key, bucket);
    }
    // jour de la semaine + mois : « Dimanche · nov. » lève l'ambiguïté quand la liste passe d'un mois à l'autre
    const weekdayFormat = new Intl.DateTimeFormat(locale.value || undefined, { weekday: 'long' });
    const monthFormat = new Intl.DateTimeFormat(locale.value || undefined, { month: 'short' });
    return [...groups.entries()].map(([key, rows]) => {
        const date = parseYmd(key);
        const net = rows.reduce((sum, row) => sum + (row.kind === 'income' ? row.due.plannedAmount : -row.due.plannedAmount), 0);
        const weekday = date ? `${weekdayFormat.format(date)} · ${monthFormat.format(date)}` : '';
        return {
            key,
            dayNumber: key.slice(8, 10).replace(/^0/, ''),
            weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
            rows,
            total: formatSignedPlannedAmount(net, net >= 0 ? 'income' : 'expense', rows[0].currency, locale.value),
            totalTone: net >= 0 ? 'su-pos' : 'su-neg'
        };
    });
});

/** Pictogramme du modèle porteur (liste chargée, sinon détail en cache). */
function visual(row: RecurringUpcomingRow) {
    void store.detailsEpoch;
    const list = row.kind === 'expense' ? store.expenses : store.incomes;
    const template = list.find((item) => item.publicId === row.templatePublicId) ?? store.getDetail(row.kind, row.templatePublicId);
    const type = template ? ('expenseType' in template ? template.expenseType : template.incomeType) : null;
    return recurringTypeVisual(row.kind, type);
}

function statusLabel(row: RecurringUpcomingRow): string {
    return t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`);
}

function statusTone(row: RecurringUpcomingRow): string {
    const status = displayDueStatus(row.due, row.kind);
    if (isDueSettled(row.due, row.kind)) return 'is-settled';
    if (status === 'enRetard' || status === 'retard') return 'is-late';
    return '';
}

function amountLabel(row: RecurringUpcomingRow): string {
    return formatSignedPlannedAmount(row.due.plannedAmount, row.kind, row.currency, locale.value);
}
</script>

<template>
    <div class="upcoming-timeline" :class="{ 'is-flat': !byDay }">
        <template v-if="byDay">
            <section v-for="day in days" :key="day.key" class="upcoming-day">
                <div class="upcoming-day__side">
                    <p class="upcoming-day__num">{{ day.dayNumber }}</p>
                    <p class="upcoming-day__weekday">{{ day.weekday }}</p>
                    <p class="upcoming-day__count">{{ t('recurrencesPage.timeline.dues', { count: day.rows.length }, day.rows.length) }}</p>
                    <p class="upcoming-day__total" :class="day.totalTone">{{ day.total }}</p>
                </div>
                <div class="upcoming-day__rows">
                    <button
                        v-for="row in day.rows"
                        :key="`${row.kind}-${row.due.publicId}`"
                        type="button"
                        class="upcoming-row"
                        @click="emit('open', row)"
                    >
                        <span class="su-tile" :class="`su-tile--${visual(row).tone}`" aria-hidden="true">
                            <component :is="visual(row).icon" :size="18" stroke-width="1.7" />
                        </span>
                        <span class="upcoming-row__meta">
                            <span class="upcoming-row__name">{{ row.templateName }}</span>
                            <span class="upcoming-row__sub">
                                {{ accountName(row.accountPublicId) }} ·
                                <span :class="statusTone(row)">{{ statusLabel(row) }}</span>
                            </span>
                        </span>
                        <span
                            class="su-chip upcoming-row__kind"
                            :style="{ '--chip-color': row.kind === 'income' ? 'var(--blue)' : 'var(--ink)' }"
                        >
                            {{ t(`recurrencesPage.kinds.${row.kind}`) }}
                        </span>
                        <span class="upcoming-row__amount" :class="row.kind === 'income' ? 'su-pos' : 'su-neg'">{{
                            amountLabel(row)
                        }}</span>
                    </button>
                </div>
            </section>
        </template>
        <div v-else class="upcoming-flat">
            <button
                v-for="row in rows"
                :key="`${row.kind}-${row.due.publicId}`"
                type="button"
                class="upcoming-row"
                @click="emit('open', row)"
            >
                <span class="su-tile" :class="`su-tile--${visual(row).tone}`" aria-hidden="true">
                    <component :is="visual(row).icon" :size="18" stroke-width="1.7" />
                </span>
                <span class="upcoming-row__meta">
                    <span class="upcoming-row__name">{{ row.templateName }}</span>
                    <span class="upcoming-row__sub">
                        {{ formatCalendarDate(row.due.scheduledAt, locale) }} · {{ accountName(row.accountPublicId) }} ·
                        <span :class="statusTone(row)">{{ statusLabel(row) }}</span>
                    </span>
                </span>
                <span class="su-chip upcoming-row__kind" :style="{ '--chip-color': row.kind === 'income' ? 'var(--blue)' : 'var(--ink)' }">
                    {{ t(`recurrencesPage.kinds.${row.kind}`) }}
                </span>
                <span class="upcoming-row__amount" :class="row.kind === 'income' ? 'su-pos' : 'su-neg'">{{ amountLabel(row) }}</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.upcoming-timeline {
    font-variant-numeric: tabular-nums;
}

/* jour : filet 2 px noir, colonne 132 px | lignes */
.upcoming-day {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 24px;
    padding: 18px 0 6px;
    border-top: 1px solid var(--line);
}

.upcoming-day__side p {
    margin: 0;
}

.upcoming-day__num {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.06em;
    line-height: 1;
}

.upcoming-day__weekday {
    margin-top: 10px !important;
    font-weight: 700;
}

.upcoming-day__count {
    margin-top: 2px !important;
    color: var(--gray);
    font-size: 13px;
}

.upcoming-day__total {
    margin-top: 10px !important;
    font-weight: 700;
}

.upcoming-day__rows {
    min-width: 0;
}

.upcoming-day__rows > .upcoming-row:first-child {
    border-top: 0;
}

.upcoming-flat {
    border-top: 1px solid var(--line);
}

.upcoming-flat > .upcoming-row:first-child {
    border-top: 0;
}

/* ligne : 36px | nom + sous-ligne | nature | montant 120px */
.upcoming-row {
    appearance: none;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto 120px;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 8px;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s var(--ease);
}

.upcoming-row:hover {
    background: var(--soft);
}

.upcoming-row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.upcoming-row__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.upcoming-row__name {
    font-weight: 700;
    letter-spacing: -0.006em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.upcoming-row__sub {
    color: var(--gray);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.upcoming-row__sub .is-late {
    color: var(--violet-ink);
    font-weight: 700;
}

.upcoming-row__kind {
    white-space: nowrap;
}

.upcoming-row__amount {
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
}

@media (max-width: 767px) {
    .upcoming-day {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding-top: 14px;
    }

    /* la colonne « jour » devient une ligne */
    .upcoming-day__side {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 4px 10px;
    }

    .upcoming-day__num {
        font-size: 28px;
        letter-spacing: -0.04em;
    }

    .upcoming-day__weekday,
    .upcoming-day__count,
    .upcoming-day__total {
        margin-top: 0 !important;
    }

    .upcoming-day__total {
        margin-left: auto;
    }

    .upcoming-day__rows > .upcoming-row:first-child {
        border-top: 1px solid var(--line);
    }

    .upcoming-row {
        grid-template-columns: 36px minmax(0, 1fr) auto;
        grid-template-areas: 'tile meta amount';
        gap: 2px 12px;
        padding: 10px 0;
    }

    .upcoming-row > .su-tile {
        grid-area: tile;
        align-self: center;
    }

    .upcoming-row__meta {
        grid-area: meta;
    }

    /* la nature est déjà lisible au signe et à la couleur du montant */
    .upcoming-row__kind {
        display: none;
    }

    .upcoming-row__amount {
        grid-area: amount;
    }
}
</style>
