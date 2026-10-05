<script setup lang="ts">
/**
 * « Votre espace financier vous suit » : le même solde, à jour du dernier import, sur ordinateur
 * portable et smartphone. Conçue pour un fond de section sombre (pas de halo).
 */
import {
    ArrowsExchangeIcon,
    BuildingBankIcon,
    ChartPieIcon,
    CreditCardIcon,
    DevicesIcon,
    FileCheckIcon,
    HomeIcon,
    MenuIcon,
    PigMoneyIcon,
    PlusIcon,
    SettingsIcon,
    TargetIcon,
    WalletIcon
} from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import { MOCK_APP_HOST, swissNumber } from '../format';

// 9’215.30 + 4’280.40 − 655.20 = 12’840.50
const accounts = [
    { icon: BuildingBankIcon, tone: 'red', name: 'UBS', label: 'Compte privé', amount: 9215.3 },
    { icon: PigMoneyIcon, tone: 'amber', name: 'PostFinance', label: 'Épargne', amount: 4280.4 },
    { icon: CreditCardIcon, tone: 'primary', name: 'Visa ••42', label: 'Carte de crédit', amount: -655.2 }
];
const total = accounts.reduce((sum, a) => sum + a.amount, 0);

const line = 'M0 27 L12 25 L24 26 L36 20 L48 22 L60 16 L72 17 L84 11 L96 13 L108 7 L120 8';
const nav = [HomeIcon, ArrowsExchangeIcon, ChartPieIcon, TargetIcon];
</script>

<template>
    <MockStage
        ratio="5 / 4"
        decor="none"
        label="Le même solde de CHF 12’840.50, à jour du dernier import, sur un ordinateur portable et un smartphone"
    >
        <div class="aw-laptop" style="left: 2.2em; top: 6.6em">
            <div class="aw-laptop__screen">
                <span class="aw-laptop__cam"></span>
                <div class="aw-browser">
                    <span class="aw-browser__bar">
                        <span class="mk-window__omnibox">
                            <svg viewBox="0 0 24 24" class="mk-window__lock" aria-hidden="true">
                                <rect x="5" y="11" width="14" height="10" rx="2" />
                                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                            <span class="mk-window__host">{{ MOCK_APP_HOST }}</span
                            ><span class="mk-window__path">/comptes</span>
                        </span>
                    </span>
                    <div class="aw-display">
                        <nav class="aw-nav">
                            <span class="aw-nav__logo"><WalletIcon /></span>
                            <span v-for="(icon, i) in nav" :key="i" :class="{ 'is-active': i === 0 }"><component :is="icon" /></span>
                            <span style="margin-top: auto"><SettingsIcon /></span>
                        </nav>
                        <div class="aw-main">
                            <div class="mk-between" style="margin-bottom: 0.8em">
                                <div>
                                    <span class="mk-eyebrow">Octobre 2026</span>
                                    <span class="mk-title" style="font-size: 1.05em; margin-top: 0.15em">Mes comptes</span>
                                </div>
                                <span class="mk-chip mk-tone-green"><FileCheckIcon class="aw-chip-ico" />Import du 30 sept.</span>
                            </div>

                            <div class="mk-card" style="position: relative; padding: 0.85em 1em 0.6em">
                                <div class="mk-between">
                                    <span class="mk-label">Solde total</span>
                                    <span class="mk-delta mk-delta--up">▲ 2.4 % ce mois</span>
                                </div>
                                <span class="mk-kpi" style="font-size: 1.6em; margin-top: 0.1em"
                                    ><small>CHF</small>{{ swissNumber(total) }}</span
                                >
                                <svg
                                    class="mk-spark"
                                    viewBox="0 0 120 32"
                                    preserveAspectRatio="none"
                                    style="height: 3.3em; margin-top: 0.3em"
                                >
                                    <defs>
                                        <linearGradient id="aw-fill-desk" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0" stop-color="rgb(93,135,255)" stop-opacity="0.26" />
                                            <stop offset="1" stop-color="rgb(93,135,255)" stop-opacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path :d="`${line} L120 32 L0 32 Z`" fill="url(#aw-fill-desk)" />
                                    <path
                                        :d="line"
                                        fill="none"
                                        stroke="rgb(93,135,255)"
                                        stroke-width="1.6"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        vector-effect="non-scaling-stroke"
                                    />
                                </svg>
                            </div>

                            <div class="aw-tiles">
                                <div v-for="a in accounts" :key="a.name" class="mk-card" style="position: relative; padding: 0.6em 0.7em">
                                    <div class="mk-flex" style="gap: 0.45em">
                                        <span class="mk-accent" :class="`mk-tone-${a.tone}`" style="height: 1.6em"></span>
                                        <div>
                                            <span class="mk-title" style="font-size: 0.7em">{{ a.name }}</span>
                                            <span class="mk-label" style="font-size: 0.58em; margin-top: 0.1em">{{ a.label }}</span>
                                        </div>
                                    </div>
                                    <span class="mk-amount aw-tile__amount">{{ swissNumber(a.amount) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="aw-laptop__base"><i></i></div>
        </div>

        <MockPhone class="mk-bob" style="left: 29.8em; top: 3.2em">
            <div class="mk-between" style="margin-top: 0.2em">
                <span class="mk-label">Solde total</span>
                <span class="mk-chip mk-tone-green" style="height: 1.6em; font-size: 0.58em"
                    ><FileCheckIcon class="aw-chip-ico" />À jour</span
                >
            </div>
            <span class="mk-kpi" style="font-size: 1.55em; margin-top: 0.2em"><small>CHF</small>{{ swissNumber(total) }}</span>
            <span class="mk-delta mk-delta--up" style="margin-top: 0.45em">▲ 2.4 % ce mois</span>

            <svg class="mk-spark" viewBox="0 0 120 32" style="margin: 0.9em 0 0.7em; height: 3.2em">
                <defs>
                    <linearGradient id="aw-fill-phone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="rgb(93,135,255)" stop-opacity="0.28" />
                        <stop offset="1" stop-color="rgb(93,135,255)" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path :d="`${line} L120 32 L0 32 Z`" fill="url(#aw-fill-phone)" />
                <path :d="line" fill="none" stroke="rgb(93,135,255)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <span class="mk-eyebrow" style="margin-bottom: 0.3em">Mes comptes</span>
            <div class="mk-card" style="position: relative; padding: 0.15em 0.75em">
                <div class="mk-list">
                    <div v-for="a in accounts" :key="a.name" class="mk-row" style="min-height: 2.6em; gap: 0.55em">
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${a.tone}`"><component :is="a.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.74em">{{ a.name }}</span>
                            <span class="mk-label">{{ a.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount" style="font-size: 0.68em">{{ swissNumber(a.amount) }}</span>
                    </div>
                </div>
            </div>

            <nav class="mk-tabbar">
                <span class="is-active"><HomeIcon /></span>
                <span><ArrowsExchangeIcon /></span>
                <span class="mk-tabbar__add"><PlusIcon /></span>
                <span><ChartPieIcon /></span>
                <span><MenuIcon /></span>
            </nav>
        </MockPhone>

        <div class="mk-float mk-bob mk-bob--late" style="left: 11em; top: 31em">
            <span class="mk-ico mk-tone-green"><DevicesIcon /></span>
            <div>
                <span class="mk-title">Le même carnet, partout</span>
                <span class="mk-label">Ordinateur portable et smartphone</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.aw-laptop {
    position: absolute;
    width: 30em;
}

.aw-laptop__screen {
    position: relative;
    height: 20.8em;
    padding: 0.75em 0.75em 0.9em;
    border-radius: 1.4em 1.4em 0.5em 0.5em;
    background: linear-gradient(150deg, #2c3344, #0d1220 60%, #2a3142);
    box-shadow:
        0 0 0 0.08em #51596b inset,
        0 0 0 0.08em rgba(255, 255, 255, 0.08);
}

.aw-laptop__cam {
    position: absolute;
    top: 0.3em;
    left: 50%;
    width: 0.3em;
    height: 0.3em;
    border-radius: 50%;
    background: #3a4254;
    transform: translateX(-50%);
}

.aw-laptop__base {
    position: relative;
    height: 1.05em;
    margin: 0 -1.4em;
    border-radius: 0.2em 0.2em 1.4em 1.4em;
    background: linear-gradient(180deg, #e3e7ef, #b4bccb 55%, #8a93a6);
    box-shadow: 0 1.6em 2.4em -1em rgba(0, 0, 0, 0.55);
}

.aw-laptop__base i {
    position: absolute;
    top: 0;
    left: 50%;
    width: 5em;
    height: 0.38em;
    border-radius: 0 0 0.5em 0.5em;
    background: #9aa2b3;
    transform: translateX(-50%);
}

.aw-browser {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: 0.6em;
    background: var(--mk-canvas);
}

.aw-browser__bar {
    display: flex;
    flex: none;
    padding: 0.35em 0.6em;
    border-bottom: 0.06em solid var(--mk-line);
    background: #fff;
}

.aw-browser__bar .mk-window__omnibox {
    height: 1.4em;
    font-size: 0.56em;
}

.aw-display {
    display: flex;
    flex: 1;
    min-height: 0;
    gap: 0.8em;
    overflow: hidden;
    background: var(--mk-canvas);
}

.aw-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45em;
    flex: none;
    width: 2.9em;
    padding: 0.9em 0;
    border-right: 0.06em solid var(--mk-line);
    background: rgba(255, 255, 255, 0.75);
}

.aw-nav > span {
    display: grid;
    place-items: center;
    width: 1.85em;
    height: 1.85em;
    border-radius: 0.6em;
    color: var(--mk-muted);
}

.aw-nav > span svg {
    width: 1em;
    height: 1em;
}

.aw-nav > span.is-active {
    color: rgb(var(--mk-primary));
    background: rgba(var(--mk-primary), 0.12);
}

.aw-nav > .aw-nav__logo {
    margin-bottom: 0.5em;
    color: #fff;
    background: linear-gradient(145deg, rgb(93, 135, 255), rgb(73, 190, 255));
}

.aw-main {
    flex: 1;
    min-width: 0;
    padding: 1em 2.6em 1em 0;
}

.aw-chip-ico {
    width: 1.1em;
    height: 1.1em;
}

.aw-tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6em;
    margin-top: 0.6em;
}

.aw-tile__amount {
    display: block;
    margin-top: 0.55em;
    font-size: 0.8em;
}
</style>
