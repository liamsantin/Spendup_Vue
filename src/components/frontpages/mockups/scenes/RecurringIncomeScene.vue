<script setup lang="ts">
/**
 * Parcours « Revenus récurrents » : prochains revenus datés + prévision sur 3 mois avec 13e salaire.
 */
import { BriefcaseIcon, BuildingIcon, CalendarEventIcon, HeartIcon, PlusIcon, RepeatIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { signedAmount, swissNumber } from '../format';

const incomes = [
    {
        day: '1er',
        icon: BuildingIcon,
        tone: 'violet',
        title: 'Loyer perçu · studio à Fribourg',
        label: 'Mensuel · le 1er · dans 3 jours',
        amount: 1450
    },
    { day: '10', icon: HeartIcon, tone: 'teal', title: 'Allocations familiales', label: 'Mensuel · le 10 · 1 enfant', amount: 322 },
    { day: '25', icon: BriefcaseIcon, tone: 'green', title: 'Salaire · Alpina Conseil SA', label: 'Mensuel · le 25 · net', amount: 6250 }
];

const monthly = incomes.reduce((sum, i) => sum + i.amount, 0);
const bonus = 6250;
const months = [
    { name: 'Oct.', base: monthly, extra: 0 },
    { name: 'Nov.', base: monthly, extra: 0 },
    { name: 'Déc.', base: monthly, extra: bonus }
];
const quarter = months.reduce((sum, m) => sum + m.base + m.extra, 0);
const max = monthly + bonus;
/* hauteur utile des barres, en em */
const barHeight = 10;
const h = (value: number) => `${(value / max) * barHeight}em`;
</script>

<template>
    <MockStage label="Revenus récurrents à venir et prévision des trois prochains mois avec le 13e salaire en décembre, en francs suisses">
        <MockWindow title="Spend.Up · Revenus à venir" style="left: 1.2em; top: 1.6em; width: 43.6em; height: 27.8em">
            <div class="mk-card mk-card--pad" style="left: 1em; top: 1em; width: 23.4em; bottom: 1em">
                <div class="mk-between">
                    <div>
                        <span class="mk-eyebrow">Octobre 2026</span>
                        <span class="mk-title" style="font-size: 1.05em; margin-top: 0.2em">Revenus à venir</span>
                    </div>
                    <span class="mk-chip mk-tone-green"><RepeatIcon class="inc-chip-ico" />3 récurrents</span>
                </div>

                <div class="inc-timeline">
                    <div v-for="i in incomes" :key="i.title" class="inc-item">
                        <span class="inc-date">
                            <b>{{ i.day }}</b>
                            <small>oct.</small>
                        </span>
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${i.tone}`"><component :is="i.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ i.title }}</span>
                            <span class="mk-label">{{ i.label }}</span>
                        </div>
                        <span class="mk-amount mk-amount--pos" style="font-size: 0.78em">{{ signedAmount(i.amount) }}</span>
                    </div>
                </div>

                <div class="mk-divider" style="margin: 1.1em 0 0.9em"></div>
                <div class="mk-between">
                    <span class="mk-sub" style="font-size: 0.72em">Total attendu en octobre</span>
                    <span class="mk-amount mk-amount--pos" style="font-size: 0.9em">+ CHF {{ swissNumber(monthly) }}</span>
                </div>
                <span class="inc-add"><PlusIcon />Ajouter un revenu récurrent</span>
            </div>

            <div class="mk-card mk-card--pad" style="left: 25.4em; top: 1em; right: 1em; bottom: 1em">
                <span class="mk-label">Prévision · 3 prochains mois</span>
                <span class="mk-kpi" style="font-size: 1.55em; margin-top: 0.15em"><small>CHF</small>{{ swissNumber(quarter, 0) }}</span>

                <div class="inc-chart">
                    <div v-for="m in months" :key="m.name" class="inc-col">
                        <span class="inc-value" :class="{ 'is-bonus': m.extra }">{{ swissNumber(m.base + m.extra, 0) }}</span>
                        <div class="inc-bar">
                            <i v-if="m.extra" class="inc-bar__extra" :style="{ height: h(m.extra) }"></i>
                            <i class="inc-bar__base" :style="{ height: h(m.base) }"></i>
                        </div>
                        <span class="inc-month">{{ m.name }}</span>
                    </div>
                    <span class="inc-bonus-tag mk-chip mk-chip--solid mk-tone-amber">13e salaire · + {{ swissNumber(bonus, 0) }}</span>
                </div>

                <div class="mk-flex inc-legend">
                    <span><i style="background: rgb(var(--mk-green))"></i>Récurrents</span>
                    <span><i style="background: rgb(var(--mk-amber))"></i>13e salaire</span>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob" style="left: 3em; top: 28.3em">
            <span class="mk-ico mk-tone-green"><CalendarEventIcon /></span>
            <div>
                <span class="mk-title">Prévision · + CHF {{ swissNumber(monthly, 0) }} / mois</span>
                <span class="mk-label">salaire, loyer perçu et allocations</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.inc-chip-ico {
    width: 1.1em;
    height: 1.1em;
}

.inc-timeline {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.9em;
    margin-top: 1.3em;
}

/* fil de la timeline, derrière les pastilles de date */
.inc-timeline::before {
    content: '';
    position: absolute;
    top: 1.5em;
    bottom: 1.5em;
    left: 1.25em;
    width: 0.1em;
    background: var(--mk-line);
}

.inc-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.7em;
    min-height: 3.3em;
}

.inc-date {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 2.6em;
    height: 2.6em;
    border: 0.06em solid var(--mk-line);
    border-radius: 0.8em;
    background: #fff;
    line-height: 1;
}

.inc-date b {
    font-size: 0.82em;
    font-weight: 720;
}

.inc-date small {
    margin-top: 0.15em;
    color: var(--mk-muted);
    font-size: 0.52em;
    font-weight: 650;
}

.inc-item .mk-title {
    font-size: 0.78em;
}

.inc-chart {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1em;
    align-items: end;
    height: 14em;
    margin-top: 0.8em;
    padding: 0 0.3em;
    border-bottom: 0.06em solid var(--mk-line);
}

.inc-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
}

.inc-value {
    color: var(--mk-ink-soft);
    font-size: 0.62em;
    font-weight: 680;
}

.inc-value.is-bonus {
    color: rgb(var(--mk-amber));
}

.inc-bar {
    display: flex;
    flex-direction: column;
    width: 2.6em;
    overflow: hidden;
    border-radius: 0.55em 0.55em 0.2em 0.2em;
}

.inc-bar i {
    display: block;
}

.inc-bar__base {
    background: linear-gradient(180deg, rgb(var(--mk-green)), rgba(var(--mk-green), 0.72));
}

.inc-bar__extra {
    border-bottom: 0.12em solid #fff;
    background: repeating-linear-gradient(135deg, rgb(var(--mk-amber)) 0 0.35em, rgba(var(--mk-amber), 0.82) 0.35em 0.7em);
}

.inc-month {
    position: absolute;
    bottom: -1.9em;
    color: var(--mk-muted);
    font-size: 0.62em;
    font-weight: 650;
}

.inc-col {
    position: relative;
}

.inc-bonus-tag {
    position: absolute;
    top: 1.6em;
    right: 0;
    height: 1.7em;
    font-size: 0.6em;
}

.inc-add {
    position: absolute;
    right: 1.75em;
    bottom: 1.6em;
    left: 1.75em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    height: 2.9em;
    border: 0.1em dashed rgba(17, 26, 51, 0.14);
    border-radius: 0.8em;
    color: var(--mk-ink-soft);
    font-size: 0.68em;
    font-weight: 620;
}

.inc-add svg {
    width: 1.1em;
    height: 1.1em;
}

.inc-legend {
    gap: 1em;
    margin-top: 1.7em;
}

.inc-legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    color: var(--mk-ink-soft);
    font-size: 0.62em;
    font-weight: 600;
}

.inc-legend i {
    width: 0.7em;
    height: 0.7em;
    border-radius: 0.2em;
}
</style>
