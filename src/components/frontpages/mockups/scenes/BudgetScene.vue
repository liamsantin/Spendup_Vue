<script setup lang="ts">
/**
 * Parcours « Planifier » : budgets mensuels par catégorie (desktop) + objectif d'épargne (mobile).
 */
import {
    AlertTriangleIcon,
    ArrowsExchangeIcon,
    BusIcon,
    CalendarEventIcon,
    ChartPieIcon,
    CoinsIcon,
    DeviceGamepad2Icon,
    HomeIcon,
    MenuIcon,
    PigMoneyIcon,
    PlaneIcon,
    PlusIcon,
    ShoppingCartIcon,
    ToolsKitchen2Icon,
    WalletIcon
} from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { swissNumber } from '../format';

const budgets = [
    { icon: ShoppingCartIcon, tone: 'primary', name: 'Courses', spent: 574, limit: 700, warn: false },
    { icon: ToolsKitchen2Icon, tone: 'violet', name: 'Restaurants', spent: 186, limit: 250, warn: false },
    { icon: BusIcon, tone: 'amber', name: 'Transports', spent: 182, limit: 190, warn: true },
    { icon: DeviceGamepad2Icon, tone: 'green', name: 'Loisirs', spent: 95, limit: 200, warn: false }
];

const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
const percent = (b: { spent: number; limit: number }) => Math.round((b.spent / b.limit) * 100);

/* Anneau de progression : r = 15.915 → circonférence ≈ 100 */
const goalPercent = 72;
</script>

<template>
    <MockStage label="Budgets mensuels par catégorie et objectif d’épargne « Voyage au Japon » dans Spend.Up, montants en francs suisses">
        <MockWindow title="Spend.Up · Budgets" style="left: 1.2em; top: 3em; width: 30em; height: 25.8em">
            <div class="mk-between" style="margin-bottom: 0.9em">
                <div>
                    <span class="mk-eyebrow">Octobre 2026</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Budgets</span>
                </div>
                <span class="mk-chip mk-tone-primary" style="margin-right: 2.6em">
                    CHF {{ swissNumber(totalSpent, 0) }} / {{ swissNumber(totalLimit, 0) }}
                </span>
            </div>
            <div class="mk-card" style="position: relative; padding: 0.3em 1.1em; width: 25.6em">
                <div class="mk-list">
                    <div v-for="b in budgets" :key="b.name" class="mk-row budget-row">
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${b.tone}`"><component :is="b.icon" /></span>
                        <div class="mk-row__main">
                            <div class="mk-between">
                                <span class="mk-flex" style="gap: 0.5em">
                                    <span class="mk-title">{{ b.name }}</span>
                                    <span v-if="b.warn" class="mk-chip mk-tone-amber" style="height: 1.55em; font-size: 0.56em">
                                        <AlertTriangleIcon class="budget-chip-ico" />Presque atteint
                                    </span>
                                </span>
                                <span class="budget-amount">
                                    <b>CHF {{ b.spent }}</b
                                    ><span> / {{ b.limit }}</span>
                                </span>
                            </div>
                            <div class="mk-bar" :class="`mk-tone-${b.tone}`" style="margin: 0.45em 0 0.3em; height: 0.42em">
                                <i :style="{ width: `${percent(b)}%` }"></i>
                            </div>
                            <div class="mk-between">
                                <span class="mk-label" style="margin: 0">{{ percent(b) }} % utilisé</span>
                                <span class="mk-label" style="margin: 0">Reste CHF {{ b.limit - b.spent }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MockWindow>

        <MockPhone class="mk-bob" style="left: 29.8em; top: 1.7em">
            <span class="mk-eyebrow">Objectif d’épargne</span>
            <span class="mk-title" style="font-size: 1.02em; margin-top: 0.2em">Voyage au Japon</span>

            <div class="goal-ring">
                <svg viewBox="0 0 36 36">
                    <defs>
                        <linearGradient id="budget-ring-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stop-color="rgb(73,190,255)" />
                            <stop offset="1" stop-color="rgb(93,135,255)" />
                        </linearGradient>
                    </defs>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(17,26,51,0.07)" stroke-width="2.6" />
                    <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="url(#budget-ring-grad)"
                        stroke-width="2.6"
                        stroke-linecap="round"
                        :stroke-dasharray="`${goalPercent} ${100 - goalPercent}`"
                        stroke-dashoffset="25"
                    />
                </svg>
                <div class="goal-ring__center">
                    <span class="goal-ring__ico mk-ico mk-ico--sm mk-tone-primary"><PlaneIcon /></span>
                    <span class="mk-kpi" style="font-size: 1.5em">{{ goalPercent }} %</span>
                    <span class="mk-label" style="font-size: 0.6em">CHF 3’600 / 5’000</span>
                </div>
            </div>

            <div class="mk-card" style="position: relative; padding: 0.15em 0.75em">
                <div class="mk-list">
                    <div class="mk-row" style="min-height: 2.5em; gap: 0.55em">
                        <span class="mk-ico mk-ico--sm mk-tone-green"><PigMoneyIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.72em">CHF 350 par mois</span>
                            <span class="mk-label">Versement auto · le 26</span>
                        </div>
                    </div>
                    <div class="mk-row" style="min-height: 2.5em; gap: 0.55em">
                        <span class="mk-ico mk-ico--sm mk-tone-amber"><CoinsIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.72em">Reste CHF 1’400</span>
                            <span class="mk-label">soit 4 versements</span>
                        </div>
                    </div>
                    <div class="mk-row" style="min-height: 2.5em; gap: 0.55em">
                        <span class="mk-ico mk-ico--sm mk-tone-violet"><CalendarEventIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.72em">Atteint en février 2027</span>
                            <span class="mk-label">au rythme actuel</span>
                        </div>
                    </div>
                </div>
            </div>

            <nav class="mk-tabbar">
                <span><HomeIcon /></span>
                <span><ArrowsExchangeIcon /></span>
                <span class="mk-tabbar__add"><PlusIcon /></span>
                <span class="is-active"><ChartPieIcon /></span>
                <span><MenuIcon /></span>
            </nav>
        </MockPhone>

        <div class="mk-float mk-bob mk-bob--late" style="left: 2.6em; top: 27.6em">
            <span class="mk-ico mk-tone-green"><WalletIcon /></span>
            <div>
                <span class="mk-title">Reste à vivre · CHF 1’240</span>
                <span class="mk-label">jusqu’au 25 octobre, jour de paie</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.budget-row {
    min-height: 3.9em;
    padding: 0.6em 0;
    align-items: flex-start;
}

.budget-row .mk-ico {
    margin-top: 0.1em;
}

.budget-amount {
    font-size: 0.74em;
    white-space: nowrap;
}

.budget-amount b {
    font-weight: 680;
}

.budget-amount span {
    color: var(--mk-muted);
    font-weight: 560;
}

.budget-chip-ico {
    width: 1.1em;
    height: 1.1em;
}

.goal-ring {
    position: relative;
    width: 9.2em;
    height: 9.2em;
    margin: 0.8em auto 0.9em;
}

.goal-ring svg {
    display: block;
    width: 100%;
    height: 100%;
}

.goal-ring__center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15em;
}

.goal-ring__ico {
    margin-bottom: 0.2em;
}
</style>
