<script setup lang="ts">
/**
 * « Calendrier & échéances » : vue mensuelle d'octobre 2026 avec les revenus et charges
 * planifiés, liste des prochaines échéances et cashflow du mois (qui s'additionne).
 */
import {
    BriefcaseIcon,
    CalendarEventIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FirstAidKitIcon,
    HomeIcon,
    ReceiptTaxIcon,
    UsersIcon
} from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { chf, signedAmount } from '../format';

type Tone = 'green' | 'red' | 'violet' | 'amber' | 'primary';

const events: Record<number, Tone> = { 1: 'violet', 5: 'red', 10: 'green', 25: 'green', 31: 'amber' };

const weekdays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

// Octobre 2026 commence un jeudi : 3 jours de septembre avant, 1 jour de novembre après.
const cells = [
    ...[28, 29, 30].map((day) => ({ day, out: true, tone: undefined as Tone | undefined })),
    ...Array.from({ length: 31 }, (_, i) => ({ day: i + 1, out: false, tone: events[i + 1] })),
    { day: 1, out: true, tone: undefined }
];

const upcoming = [
    { icon: HomeIcon, tone: 'violet', title: 'Loyer', label: 'Jeu. 1 oct. · mensuel', amount: -1890 },
    { icon: FirstAidKitIcon, tone: 'red', title: 'Assurance maladie', label: 'Lun. 5 oct. · mensuel', amount: -412.8 },
    { icon: UsersIcon, tone: 'green', title: 'Allocations familiales', label: 'Sam. 10 oct. · mensuel', amount: 322 },
    { icon: BriefcaseIcon, tone: 'green', title: 'Salaire', label: 'Dim. 25 oct. · mensuel', amount: 6250 },
    { icon: ReceiptTaxIcon, tone: 'amber', title: 'Acompte d’impôts', label: 'Sam. 31 oct. · 10/12', amount: -2085.2 }
];

const cashflow = upcoming.reduce((sum, item) => sum + item.amount, 0);
const inflows = upcoming.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
const outflows = upcoming.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0);
</script>

<template>
    <MockStage label="Calendrier d’octobre 2026 avec les échéances, les revenus planifiés et le cashflow du mois">
        <MockWindow title="Spendup · Calendrier" style="left: 1.2em; top: 1.6em; width: 43.6em; height: 30.2em">
            <div class="cal-layout">
                <div class="cal-month">
                    <div class="mk-between" style="margin-bottom: 0.9em">
                        <div class="mk-flex">
                            <span class="mk-ico mk-tone-primary"><CalendarEventIcon /></span>
                            <div>
                                <span class="mk-eyebrow">Calendrier</span>
                                <span class="mk-title" style="font-size: 1.1em; margin-top: 0.15em">Octobre 2026</span>
                            </div>
                        </div>
                        <div class="mk-flex" style="gap: 0.3em">
                            <span class="cal-nav"><ChevronLeftIcon /></span>
                            <span class="cal-nav"><ChevronRightIcon /></span>
                        </div>
                    </div>

                    <div class="cal-grid cal-grid--head">
                        <span v-for="d in weekdays" :key="d">{{ d }}</span>
                    </div>
                    <div class="cal-grid">
                        <span
                            v-for="(c, i) in cells"
                            :key="i"
                            class="cal-day"
                            :class="{ 'is-out': c.out, 'is-selected': !c.out && c.day === 5, 'is-weekend': i % 7 >= 5 }"
                        >
                            <b>{{ c.day }}</b>
                            <i v-if="c.tone" :class="`mk-tone-${c.tone}`"></i>
                        </span>
                    </div>

                    <div class="cal-legend">
                        <span><i class="mk-tone-green"></i>Revenus</span>
                        <span><i class="mk-tone-violet"></i>Logement</span>
                        <span><i class="mk-tone-red"></i>Assurances</span>
                        <span><i class="mk-tone-amber"></i>Impôts</span>
                    </div>
                </div>

                <div class="mk-card cal-side">
                    <span class="mk-title">Prochaines échéances</span>
                    <span class="mk-label" style="margin-top: 0.15em">5 opérations planifiées</span>
                    <div class="mk-list" style="margin-top: 0.4em">
                        <div v-for="item in upcoming" :key="item.title" class="mk-row">
                            <span class="mk-ico mk-ico--sm" :class="`mk-tone-${item.tone}`"><component :is="item.icon" /></span>
                            <div class="mk-row__main">
                                <span class="mk-title">{{ item.title }}</span>
                                <span class="mk-label">{{ item.label }}</span>
                            </div>
                            <span class="mk-row__end mk-amount" :class="item.amount > 0 ? 'mk-amount--pos' : 'mk-amount--neg'">
                                {{ signedAmount(item.amount) }}
                            </span>
                        </div>
                    </div>
                    <div class="cal-split">
                        <div>
                            <span class="mk-label">Entrées</span>
                            <span class="mk-amount mk-amount--pos">{{ signedAmount(inflows) }}</span>
                        </div>
                        <div>
                            <span class="mk-label">Sorties</span>
                            <span class="mk-amount mk-amount--neg">{{ signedAmount(outflows) }}</span>
                        </div>
                    </div>
                    <div class="cal-cashflow">
                        <span class="mk-label">Cashflow d’octobre</span>
                        <span class="mk-chip mk-tone-green">+ {{ chf(cashflow, 0) }}</span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob" style="left: 3.4em; top: 28.6em">
            <span class="mk-ico mk-tone-red"><FirstAidKitIcon /></span>
            <div>
                <span class="mk-title">Assurance maladie · CHF 412.80</span>
                <span class="mk-label">Lundi 5 octobre · rappel 3 jours avant</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.cal-layout {
    display: flex;
    gap: 1em;
    height: 100%;
}

.cal-month {
    flex: none;
    width: 23em;
}

.cal-nav {
    display: grid;
    place-items: center;
    width: 1.8em;
    height: 1.8em;
    border: 0.06em solid var(--mk-line);
    border-radius: 0.55em;
    color: var(--mk-ink-soft);
    background: var(--mk-surface);
}

.cal-nav svg {
    width: 0.9em;
    height: 0.9em;
}

.cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.3em;
}

.cal-grid--head {
    margin-bottom: 0.4em;
    color: var(--mk-muted);
    font-size: 0.62em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: center;
    text-transform: uppercase;
}

.cal-day {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25em;
    height: 3.05em;
    border: 0.06em solid var(--mk-line);
    border-radius: 0.7em;
    background: var(--mk-surface);
}

.cal-day b {
    font-size: 0.74em;
    font-weight: 620;
    color: var(--mk-ink);
}

.cal-day.is-weekend {
    background: rgba(255, 255, 255, 0.55);
}

.cal-day.is-out {
    border-color: transparent;
    background: transparent;
}

.cal-day.is-out b {
    color: var(--mk-muted);
    opacity: 0.6;
}

.cal-day i {
    width: 0.4em;
    height: 0.4em;
    border-radius: 50%;
    background: rgb(var(--tone));
}

.cal-day.is-selected {
    border-color: rgb(var(--mk-primary));
    background: rgb(var(--mk-primary));
    box-shadow: 0 0.6em 1.2em -0.6em rgba(var(--mk-primary), 0.9);
}

.cal-day.is-selected b {
    color: #fff;
}

.cal-day.is-selected i {
    background: #fff;
}

.cal-legend {
    display: flex;
    gap: 1.1em;
    margin-top: 0.9em;
    color: var(--mk-ink-soft);
    font-size: 0.64em;
    font-weight: 560;
}

.cal-legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
}

.cal-legend i {
    width: 0.6em;
    height: 0.6em;
    border-radius: 50%;
    background: rgb(var(--tone));
}

.cal-side {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1em 1.1em;
}

.cal-cashflow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.8em;
    border-top: 0.06em solid var(--mk-line);
}

.cal-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6em;
    margin: auto 0 0.8em;
}

.cal-split > div {
    padding: 0.55em 0.7em;
    border-radius: 0.8em;
    background: var(--mk-canvas);
}

.cal-split .mk-amount {
    display: block;
    margin-top: 0.2em;
    font-size: 0.8em;
}

.cal-cashflow .mk-chip {
    height: 2em;
    font-size: 0.74em;
}
</style>
