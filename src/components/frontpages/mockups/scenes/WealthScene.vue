<script setup lang="ts">
/**
 * Parcours « Patrimoine » : évolution du patrimoine net sur 5 ans + répartition par classe d'actifs.
 */
import { HomeDollarIcon, TrendingUpIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { swissNumber } from '../format';

const assets = [
    { name: 'Immobilier', label: 'Appartement à Nyon, net d’hypothèque', color: 'rgb(93,135,255)', amount: 312000 },
    { name: 'Placements', label: 'Dépôt titres · ETF', color: 'rgb(139,108,245)', amount: 96400 },
    { name: 'Épargne', label: 'Comptes épargne', color: 'rgb(20,175,190)', amount: 38300 },
    { name: '3e pilier', label: 'Pilier 3a · 2 comptes', color: 'rgb(19,170,128)', amount: 29500 },
    { name: 'Véhicule', label: 'Valeur estimée', color: 'rgb(240,160,40)', amount: 10000 }
];

const total = assets.reduce((sum, a) => sum + a.amount, 0);

/* Donut : r = 15.915 → circonférence ≈ 100, chaque segment en pourcentage du total */
const segments = assets.reduce<{ color: string; length: number; offset: number }[]>((acc, a) => {
    const start = acc.reduce((sum, s) => sum + s.length, 0);
    const length = (a.amount / total) * 100;
    acc.push({ color: a.color, length, offset: 25 - start });
    return acc;
}, []);

const years = ['2022', '2023', '2024', '2025', '2026'];
const line = 'M0 79.4 L30 72.8 L60 62.6 L90 59 L120 49.4 L150 42.8 L180 33.3 L210 27.2 L240 16.3';
</script>

<template>
    <MockStage label="Patrimoine net de CHF 486’200 en hausse sur cinq ans et sa répartition par classe d’actifs dans Spend.Up">
        <MockWindow title="Spend.Up · Patrimoine" style="left: 1.2em; top: 1.4em; width: 43.6em; height: 27.2em">
            <div class="mk-card mk-card--pad" style="left: 1em; top: 1em; width: 22.4em; bottom: 1em">
                <div class="mk-between" style="align-items: flex-start">
                    <div>
                        <span class="mk-label">Patrimoine net</span>
                        <span class="mk-kpi" style="margin-top: 0.15em"><small>CHF</small>{{ swissNumber(total, 0) }}</span>
                    </div>
                    <span class="mk-delta mk-delta--up" style="margin-top: 0.3em">▲ 6.2 % sur 12 mois</span>
                </div>

                <svg class="mk-spark" viewBox="0 0 240 100" preserveAspectRatio="none" style="margin-top: 1em; height: 9.8em">
                    <defs>
                        <linearGradient id="wealth-area-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="rgb(93,135,255)" stop-opacity="0.3" />
                            <stop offset="1" stop-color="rgb(93,135,255)" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    <g stroke="rgba(17,26,51,0.07)" stroke-width="0.6" stroke-dasharray="3 3">
                        <line x1="0" y1="8" x2="240" y2="8" />
                        <line x1="0" y1="50" x2="240" y2="50" />
                        <line x1="0" y1="92" x2="240" y2="92" />
                    </g>
                    <path :d="`${line} L240 100 L0 100 Z`" fill="url(#wealth-area-fill)" />
                    <path
                        :d="line"
                        fill="none"
                        stroke="rgb(93,135,255)"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        vector-effect="non-scaling-stroke"
                    />
                </svg>
                <span class="wealth-dot"></span>
                <div class="mk-between wealth-years">
                    <span v-for="y in years" :key="y">{{ y }}</span>
                </div>

                <div class="mk-divider" style="margin: 1.1em 0 0.85em"></div>
                <div class="mk-between">
                    <div>
                        <span class="mk-label">Actifs bruts</span>
                        <span class="mk-amount wealth-stat">CHF 1’006’200</span>
                    </div>
                    <div style="text-align: right">
                        <span class="mk-label">Hypothèque</span>
                        <span class="mk-amount wealth-stat">− CHF 520’000</span>
                    </div>
                </div>
            </div>

            <div class="mk-card mk-card--pad" style="left: 24.4em; top: 1em; right: 1em; bottom: 1em; padding-block: 1em">
                <div class="mk-flex" style="gap: 1em">
                    <svg class="wealth-donut" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(17,26,51,0.06)" stroke-width="4.2" />
                        <circle
                            v-for="s in segments"
                            :key="s.color"
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            :stroke="s.color"
                            stroke-width="4.2"
                            :stroke-dasharray="`${Math.max(s.length - 0.8, 0.4)} ${100 - Math.max(s.length - 0.8, 0.4)}`"
                            :stroke-dashoffset="s.offset"
                        />
                    </svg>
                    <div>
                        <span class="mk-eyebrow">Répartition</span>
                        <span class="mk-kpi" style="font-size: 1.45em; margin-top: 0.2em">64 %</span>
                        <span class="mk-sub" style="font-size: 0.64em">en immobilier · 5 actifs</span>
                    </div>
                </div>

                <div class="wealth-legend">
                    <div v-for="a in assets" :key="a.name" class="wealth-legend__row">
                        <i :style="{ background: a.color }"></i>
                        <span class="mk-title">{{ a.name }}</span>
                        <span class="mk-amount">CHF {{ swissNumber(a.amount, 0) }}</span>
                        <span class="mk-label">{{ a.label }}</span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob" style="left: 2.4em; top: 27.2em">
            <span class="mk-ico mk-tone-violet"><TrendingUpIcon /></span>
            <div>
                <span class="mk-title">Projection 2030 · CHF 612’000</span>
                <span class="mk-label">au rythme d’épargne actuel</span>
            </div>
        </div>

        <div class="mk-float mk-bob mk-bob--late" style="left: 24.6em; top: 29.4em">
            <span class="mk-ico mk-tone-primary"><HomeDollarIcon /></span>
            <div>
                <span class="mk-title">Hypothèque · taux fixe 1.45 %</span>
                <span class="mk-label">jusqu’en 2031 · Raiffeisen</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.wealth-dot {
    position: absolute;
    top: 6.6em;
    right: 0.85em;
    width: 0.7em;
    height: 0.7em;
    border: 0.16em solid #fff;
    border-radius: 50%;
    background: rgb(var(--mk-primary));
    box-shadow: 0 0 0 0.3em rgba(var(--mk-primary), 0.18);
}

.wealth-years {
    margin-top: 0.4em;
    color: var(--mk-muted);
    font-size: 0.6em;
    font-weight: 600;
}

.wealth-stat {
    display: block;
    margin-top: 0.15em;
    font-size: 0.86em;
}

.wealth-donut {
    flex: none;
    width: 6.2em;
    height: 6.2em;
    transform: rotate(0deg);
}

.wealth-legend {
    display: flex;
    flex-direction: column;
    margin-top: 0.8em;
}

.wealth-legend__row {
    display: grid;
    grid-template-columns: 0.55em 1fr auto;
    column-gap: 0.6em;
    row-gap: 0.1em;
    align-items: center;
    padding: 0.42em 0;
}

.wealth-legend__row + .wealth-legend__row {
    border-top: 0.06em solid var(--mk-line);
}

.wealth-legend__row i {
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
}

.wealth-legend__row .mk-title {
    font-size: 0.74em;
}

.wealth-legend__row .mk-amount {
    font-size: 0.72em;
}

.wealth-legend__row .mk-label {
    grid-column: 2 / 4;
    font-size: 0.58em;
}
</style>
