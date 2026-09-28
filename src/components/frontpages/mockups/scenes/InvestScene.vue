<script setup lang="ts">
/**
 * Parcours « Investissements & crypto » : valeur du portefeuille, évolution depuis janvier
 * et positions (ETF, obligations, bitcoin), intégrées au patrimoine net.
 */
import { BuildingBankIcon, ChartLineIcon, CurrencyBitcoinIcon, WalletIcon, WorldIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { chf, swissNumber } from '../format';

const positions = [
    { icon: ChartLineIcon, tone: 'red', name: 'ETF actions suisses', label: 'Fonds indiciel · CHF', amount: 21200, delta: 3.1, prefix: '' },
    {
        icon: WorldIcon,
        tone: 'primary',
        name: 'ETF actions mondiales',
        label: 'Fonds indiciel · couvert CHF',
        amount: 24900,
        delta: 6.4,
        prefix: ''
    },
    { icon: BuildingBankIcon, tone: 'teal', name: 'Obligations', label: 'Confédération & cantons', amount: 7180, delta: 0.9, prefix: '' },
    { icon: CurrencyBitcoinIcon, tone: 'amber', name: 'Bitcoin', label: '0.058 BTC', amount: 5150, delta: 11.2, prefix: '≈ ' }
];

const total = positions.reduce((sum, position) => sum + position.amount, 0);
/* ▲ 4.8 % depuis janvier : valeur au 1er janvier ≈ 55’754 */
const gain = Math.round(total - total / 1.048);
const shares = positions.map((position) => ({ ...position, share: (position.amount / total) * 100 }));

const toneRgb: Record<string, string> = {
    red: 'var(--mk-red)',
    primary: 'var(--mk-primary)',
    teal: 'var(--mk-teal)',
    amber: 'var(--mk-amber)'
};

const periods = ['1M', '6M', 'YTD', '1A'];
const months = ['janv.', 'mars', 'mai', 'juil.', 'sept.'];

/* courbe janvier → septembre (≈ 55’750 → 58’430), repère 200 × 80 */
const line = 'M0 62 L25 58 L50 64 L75 50 L100 53 L125 40 L150 44 L175 28 L200 18';
</script>

<template>
    <MockStage
        label="Portefeuille de placements dans Spendup : CHF 58’430.00, en hausse de 4.8 % depuis janvier, réparti entre ETF, obligations et bitcoin"
    >
        <MockWindow title="Spendup · Placements" style="left: 1.2em; top: 3.2em; width: 43.6em; height: 24.4em">
            <div class="inv-grid">
                <div class="mk-card mk-card--pad inv-chart">
                    <div class="mk-between">
                        <span class="mk-label">Valeur des placements</span>
                        <span class="inv-seg">
                            <span v-for="period in periods" :key="period" :class="{ 'is-active': period === 'YTD' }">{{ period }}</span>
                        </span>
                    </div>
                    <span class="mk-kpi" style="margin-top: 0.3em"><small>CHF</small>{{ swissNumber(total) }}</span>
                    <span class="mk-delta mk-delta--up" style="margin-top: 0.4em">▲ 4.8 % depuis janvier</span>

                    <svg class="mk-spark" viewBox="0 0 200 80" preserveAspectRatio="none" style="height: 10.2em; margin-top: 0.9em">
                        <defs>
                            <linearGradient id="mk-inv-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="rgb(93,135,255)" stop-opacity="0.3" />
                                <stop offset="1" stop-color="rgb(93,135,255)" stop-opacity="0" />
                            </linearGradient>
                        </defs>
                        <line
                            v-for="y in [20, 40, 60]"
                            :key="y"
                            x1="0"
                            x2="200"
                            :y1="y"
                            :y2="y"
                            stroke="rgba(17,26,51,0.07)"
                            stroke-width="0.6"
                            stroke-dasharray="2 3"
                        />
                        <path :d="`${line} L200 80 L0 80 Z`" fill="url(#mk-inv-fill)" />
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
                    <div class="inv-axis">
                        <span v-for="month in months" :key="month">{{ month }}</span>
                    </div>
                </div>

                <div class="mk-card mk-card--pad">
                    <div class="mk-between" style="margin-bottom: 0.7em">
                        <span class="mk-title">Positions</span>
                        <span class="mk-label">4 lignes · 3 comptes</span>
                    </div>
                    <div class="inv-alloc">
                        <i
                            v-for="position in shares"
                            :key="position.name"
                            :style="{ width: `${position.share}%`, background: `rgb(${toneRgb[position.tone]})` }"
                        ></i>
                    </div>
                    <div class="mk-list" style="margin-top: 0.5em">
                        <div v-for="position in shares" :key="position.name" class="mk-row" style="min-height: 3.15em">
                            <span class="mk-ico mk-ico--sm" :class="`mk-tone-${position.tone}`"><component :is="position.icon" /></span>
                            <div class="mk-row__main">
                                <span class="mk-title">{{ position.name }}</span>
                                <span class="mk-label">{{ position.label }} · {{ Math.round(position.share) }} %</span>
                            </div>
                            <div class="mk-row__end">
                                <span class="mk-amount" style="display: block"
                                    >{{ position.prefix }}{{ swissNumber(position.amount) }}</span
                                >
                                <span class="inv-up">+ {{ position.delta.toFixed(1) }} %</span>
                            </div>
                        </div>
                    </div>
                    <div class="mk-between inv-foot">
                        <span class="mk-label">Plus-value depuis janvier</span>
                        <span class="mk-amount mk-amount--pos" style="font-size: 0.8em">+ {{ chf(gain) }}</span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob" style="left: 4.2em; top: 26.9em">
            <span class="mk-ico mk-tone-violet"><WalletIcon /></span>
            <div>
                <span class="mk-title">Intégré au patrimoine net</span>
                <span class="mk-label">Valeurs mises à jour chaque jour</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.inv-grid {
    display: grid;
    grid-template-columns: 19.4em 1fr;
    gap: 0.9em;
    height: 100%;
}

.inv-grid > .mk-card {
    position: relative;
}

.inv-seg {
    display: inline-flex;
    padding: 0.18em;
    border-radius: 0.7em;
    background: rgba(17, 26, 51, 0.05);
    font-size: 0.6em;
    font-weight: 640;
}

.inv-seg span {
    padding: 0.35em 0.65em;
    border-radius: 0.55em;
    color: var(--mk-muted);
}

.inv-seg span.is-active {
    color: var(--mk-ink);
    background: var(--mk-surface);
    box-shadow: 0 0.1em 0.3em rgba(17, 26, 51, 0.12);
}

.inv-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5em;
    color: var(--mk-muted);
    font-size: 0.58em;
    font-weight: 560;
}

.inv-alloc {
    display: flex;
    gap: 0.2em;
    height: 0.55em;
}

.inv-alloc i {
    border-radius: 99em;
}

.inv-foot {
    margin-top: 0.3em;
    padding-top: 0.7em;
    border-top: 0.06em solid var(--mk-line);
}

.inv-up {
    display: block;
    margin-top: 0.15em;
    color: rgb(var(--mk-green));
    font-size: 0.8em;
    font-weight: 660;
}
</style>
