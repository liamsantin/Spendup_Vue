<script setup lang="ts">
/** Bilan du mois (entrées, sorties, solde dans la devise dominante), prochaines sorties et légende des tons. */
import { useI18n } from 'vue-i18n';
import { occurrenceDays, parseYmd } from '@/features/calendar/dates';
import { formatOccurrenceAmount, type MonthSummary } from '@/features/calendar/occurrences';
import type { CalendarOccurrence, CalendarTone } from '@/features/calendar/types';

const TONES: CalendarTone[] = ['event', 'income', 'expense', 'due', 'goal'];

defineProps<{
    summary: MonthSummary;
    upcoming: CalendarOccurrence[];
}>();

const { t, locale } = useI18n();

function shortDate(occurrence: CalendarOccurrence): string {
    const ymd = occurrenceDays(occurrence)[0];
    if (!ymd) return '';
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).format(parseYmd(ymd));
}
</script>

<template>
    <section v-if="summary.currency" class="su-section">
        <header class="su-section__head">
            <h2>{{ t('calendarPage.monthSummary') }}</h2>
        </header>
        <dl class="cal-summary">
            <div class="su-kv">
                <dt>{{ t('calendarPage.inflows') }}</dt>
                <dd class="su-pos">{{ formatOccurrenceAmount(summary.inflows, summary.currency) }}</dd>
            </div>
            <div class="su-kv">
                <dt>{{ t('calendarPage.outflows') }}</dt>
                <dd class="su-neg">{{ formatOccurrenceAmount(summary.outflows, summary.currency) }}</dd>
            </div>
            <div class="su-kv su-kv--strong">
                <dt>{{ t('calendarPage.balance') }}</dt>
                <dd :class="summary.balance < 0 ? 'su-neg' : 'su-pos'">{{ formatOccurrenceAmount(summary.balance, summary.currency) }}</dd>
            </div>
        </dl>
        <p v-if="summary.otherCurrencies.length" class="cal-side__empty cal-summary__note">
            {{ t('calendarPage.otherCurrencies', { currencies: summary.otherCurrencies.join(', ') }) }}
        </p>
    </section>

    <section v-if="upcoming.length" class="su-section">
        <header class="su-section__head">
            <h2>{{ t('calendarPage.upcomingDues') }}</h2>
        </header>
        <ul class="cal-list">
            <li v-for="occurrence in upcoming" :key="occurrence.id" class="cal-list__item cal-tone--due">
                <span class="su-sq cal-list__sq" aria-hidden="true" />
                <span class="cal-list__main">
                    <span class="cal-list__title">{{ occurrence.title }}</span>
                    <span class="cal-list__meta">{{ shortDate(occurrence) }}</span>
                </span>
                <span v-if="occurrence.amount != null && occurrence.currency" class="cal-list__amount su-neg">{{
                    formatOccurrenceAmount(occurrence.amount, occurrence.currency, false)
                }}</span>
            </li>
        </ul>
    </section>

    <div class="cal-legend">
        <span v-for="tone in TONES" :key="tone" class="su-chip cal-legend__item" :class="`cal-tone--${tone}`">
            {{ t(`calendarPage.kinds.${tone}`) }}
        </span>
    </div>
</template>

<style scoped>
.cal-summary {
    margin: 0;
}

.cal-summary dt,
.cal-summary dd {
    margin: 0;
}

.cal-summary dd {
    font-weight: 700;
}

.cal-summary__note {
    margin-top: 8px;
    font-size: 13px;
}

.cal-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
}

.cal-legend__item {
    --chip-color: var(--tone);
}
</style>
