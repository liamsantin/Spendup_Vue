<script setup lang="ts">
/**
 * Visuel principal de la page Fonctionnalités : tableau de bord complet (desktop) + saisie
 * rapide d'une dépense (mobile) + deux indicateurs flottants.
 */
import {
    ArrowsExchangeIcon,
    BriefcaseIcon,
    BusIcon,
    CalendarEventIcon,
    CheckIcon,
    ChartPieIcon,
    CreditCardIcon,
    DiamondIcon,
    FirstAidKitIcon,
    HomeIcon,
    MoodSmileIcon,
    NoteIcon,
    SearchIcon,
    SettingsIcon,
    ShoppingCartIcon,
    TargetIcon,
    ToolsKitchen2Icon,
    TrendingUpIcon,
    WalletIcon,
    XIcon
} from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { signedAmount, swissNumber } from '../format';

const nav = [HomeIcon, ArrowsExchangeIcon, ChartPieIcon, TargetIcon, CalendarEventIcon];

const kpis = [
    { label: 'Patrimoine net', value: '486’200', delta: '▲ 6.2 %', tone: 'up' },
    { label: 'Revenus d’octobre', value: '6’572', delta: '▲ 0.4 %', tone: 'up' },
    { label: 'Dépenses d’octobre', value: '3’912', delta: '▼ 3.1 %', tone: 'up' }
];

// 1’890 + 656 + 544 + 412 + 410 = 3’912
const categories = [
    { label: 'Logement', tone: 'violet', amount: 1890 },
    { label: 'Alimentation', tone: 'amber', amount: 656 },
    { label: 'Loisirs', tone: 'primary', amount: 544 },
    { label: 'Transports', tone: 'teal', amount: 412 },
    { label: 'Santé', tone: 'red', amount: 410 }
];
const maxCategory = Math.max(...categories.map((c) => c.amount));

const transactions = [
    { icon: ShoppingCartIcon, tone: 'amber', title: 'Migros', label: 'Courses · auj.', amount: -84.35 },
    { icon: BusIcon, tone: 'teal', title: 'CFF', label: 'Transports · hier', amount: -38.6 },
    { icon: BriefcaseIcon, tone: 'green', title: 'Salaire', label: '25 oct.', amount: 6250 },
    { icon: FirstAidKitIcon, tone: 'red', title: 'Pharmacie', label: 'Santé · 24 oct.', amount: -27.9 }
];

const quickCategories = [
    { icon: ShoppingCartIcon, tone: 'amber', label: 'Courses', active: true },
    { icon: ToolsKitchen2Icon, tone: 'red', label: 'Restos', active: false },
    { icon: BusIcon, tone: 'teal', label: 'Transports', active: false },
    { icon: MoodSmileIcon, tone: 'primary', label: 'Loisirs', active: false },
    { icon: FirstAidKitIcon, tone: 'green', label: 'Santé', active: false },
    { icon: HomeIcon, tone: 'violet', label: 'Logement', active: false }
];
</script>

<template>
    <MockStage ratio="5 / 4" label="Tableau de bord Spend.Up sur ordinateur et saisie rapide d’une dépense sur smartphone">
        <MockWindow title="Spend.Up · Tableau de bord" style="left: 1.2em; top: 3.8em; width: 31.4em; height: 27.6em">
            <div class="fh-layout">
                <nav class="fh-nav">
                    <span class="fh-nav__logo"><WalletIcon /></span>
                    <span v-for="(icon, i) in nav" :key="i" :class="{ 'is-active': i === 0 }"><component :is="icon" /></span>
                    <span style="margin-top: auto"><SettingsIcon /></span>
                </nav>

                <div class="fh-main">
                    <div class="mk-between" style="margin-bottom: 0.8em">
                        <div>
                            <span class="mk-title" style="font-size: 1.05em">Bonjour Léa</span>
                            <span class="mk-label" style="margin-top: 0.15em">Vue d’ensemble · octobre 2026</span>
                        </div>
                        <span class="fh-search"><SearchIcon />Rechercher</span>
                    </div>

                    <div class="fh-kpis">
                        <div v-for="k in kpis" :key="k.label" class="mk-card" style="position: relative; padding: 0.7em 0.75em">
                            <span class="mk-label" style="font-size: 0.62em">{{ k.label }}</span>
                            <span class="mk-kpi" style="font-size: 1.02em; margin: 0.2em 0 0.35em"><small>CHF</small>{{ k.value }}</span>
                            <span class="mk-delta" :class="`mk-delta--${k.tone}`" style="font-size: 0.56em">{{ k.delta }}</span>
                        </div>
                    </div>

                    <div class="fh-duo">
                        <div class="mk-card" style="position: relative; padding: 0.8em 0.85em">
                            <div class="mk-between" style="margin-bottom: 0.55em">
                                <span class="mk-title" style="font-size: 0.78em">Par catégorie</span>
                                <span class="mk-label" style="font-size: 0.6em">CHF 3’912</span>
                            </div>
                            <div v-for="c in categories" :key="c.label" class="fh-cat">
                                <div class="mk-between">
                                    <span>{{ c.label }}</span>
                                    <b>{{ swissNumber(c.amount, 0) }}</b>
                                </div>
                                <div class="mk-bar" :class="`mk-tone-${c.tone}`" style="height: 0.42em">
                                    <i :style="{ width: `${(c.amount / maxCategory) * 100}%` }"></i>
                                </div>
                            </div>
                        </div>

                        <div class="mk-card" style="position: relative; padding: 0.8em 0.85em 0.3em">
                            <div class="mk-between" style="margin-bottom: 0.2em">
                                <span class="mk-title" style="font-size: 0.78em">Transactions</span>
                                <span class="mk-label" style="font-size: 0.6em">Tout voir</span>
                            </div>
                            <div class="mk-list">
                                <div v-for="tx in transactions" :key="tx.title" class="mk-row" style="gap: 0.5em; min-height: 2.6em">
                                    <span class="mk-ico mk-ico--sm" :class="`mk-tone-${tx.tone}`"><component :is="tx.icon" /></span>
                                    <div class="mk-row__main">
                                        <span class="mk-title" style="font-size: 0.72em">{{ tx.title }}</span>
                                        <span class="mk-label" style="font-size: 0.58em">{{ tx.label }}</span>
                                    </div>
                                    <span
                                        class="mk-row__end mk-amount"
                                        :class="tx.amount > 0 ? 'mk-amount--pos' : 'mk-amount--neg'"
                                        style="font-size: 0.68em"
                                    >
                                        {{ signedAmount(tx.amount) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MockWindow>

        <MockPhone class="mk-bob" style="left: 30.2em; top: 4.6em">
            <div class="mk-between" style="margin-top: 0.2em">
                <span class="mk-title" style="font-size: 0.9em">Nouvelle dépense</span>
                <span class="fh-close"><XIcon /></span>
            </div>

            <div class="fh-seg">
                <span class="is-active">Dépense</span>
                <span>Revenu</span>
                <span>Virement</span>
            </div>

            <div class="fh-amount">
                <span class="mk-kpi" style="font-size: 2em"><small>CHF</small>42.80</span>
            </div>

            <div class="fh-cats">
                <span v-for="c in quickCategories" :key="c.label" :class="{ 'is-active': c.active }">
                    <span class="mk-ico mk-ico--sm" :class="[`mk-tone-${c.tone}`, { 'mk-ico--solid': c.active }]"
                        ><component :is="c.icon"
                    /></span>
                    {{ c.label }}
                </span>
            </div>

            <div class="mk-card" style="position: relative; padding: 0.1em 0.75em">
                <div class="mk-list">
                    <div class="mk-row fh-field">
                        <CreditCardIcon />
                        <span class="mk-label">Compte</span>
                        <b>UBS · Privé</b>
                    </div>
                    <div class="mk-row fh-field">
                        <CalendarEventIcon />
                        <span class="mk-label">Date</span>
                        <b>Aujourd’hui</b>
                    </div>
                    <div class="mk-row fh-field">
                        <NoteIcon />
                        <span class="mk-label">Note</span>
                        <b>Coop Lausanne</b>
                    </div>
                </div>
            </div>

            <span class="fh-hint">Il restera CHF 101.20 sur le budget Courses</span>

            <span class="fh-save"><CheckIcon />Enregistrer</span>
        </MockPhone>

        <div class="mk-float mk-bob mk-bob--late" style="left: 17.6em; top: 0.4em">
            <span class="mk-ico mk-tone-violet"><DiamondIcon /></span>
            <div>
                <span class="mk-title">Patrimoine net · <span style="color: rgb(var(--mk-green))">▲ 6.2 %</span></span>
                <span class="mk-label">CHF 486’200 · sur 12 mois</span>
            </div>
            <TrendingUpIcon class="fh-trend" />
        </div>

        <div class="mk-float mk-bob" style="left: 3em; top: 29.9em">
            <span class="mk-ico mk-tone-amber"><ShoppingCartIcon /></span>
            <div style="width: 10.6em">
                <div class="mk-between">
                    <span class="mk-title">Budget courses</span>
                    <span class="mk-title" style="color: rgb(var(--mk-amber))">82 %</span>
                </div>
                <div class="mk-bar mk-tone-amber" style="margin: 0.4em 0 0.3em; height: 0.4em"><i style="width: 82%"></i></div>
                <span class="mk-label">CHF 656 sur 800 · il reste 144</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.fh-layout {
    display: flex;
    gap: 0.8em;
    height: 100%;
    margin: -1em -1em -1em -1em;
    padding: 0 2.6em 0 0;
}

.fh-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45em;
    flex: none;
    width: 3em;
    padding: 0.9em 0;
    border-right: 0.06em solid var(--mk-line);
    background: rgba(255, 255, 255, 0.7);
}

.fh-nav > span {
    display: grid;
    place-items: center;
    width: 1.9em;
    height: 1.9em;
    border-radius: 0.6em;
    color: var(--mk-muted);
}

.fh-nav > span svg {
    width: 1em;
    height: 1em;
}

.fh-nav > span.is-active {
    color: rgb(var(--mk-primary));
    background: rgba(var(--mk-primary), 0.12);
}

.fh-nav > .fh-nav__logo {
    margin-bottom: 0.5em;
    color: #fff;
    background: linear-gradient(145deg, rgb(93, 135, 255), rgb(73, 190, 255));
    box-shadow: 0 0.5em 1em -0.5em rgba(93, 135, 255, 0.9);
}

.fh-main {
    flex: 1;
    min-width: 0;
    padding: 1em 0;
}

.fh-search {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    height: 2.2em;
    padding: 0 0.9em 0 0.7em;
    border: 0.08em solid var(--mk-line);
    border-radius: 99em;
    color: var(--mk-muted);
    font-size: 0.66em;
    background: var(--mk-surface);
}

.fh-search svg {
    width: 1.1em;
    height: 1.1em;
}

.fh-kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6em;
}

.fh-duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6em;
    margin-top: 0.6em;
}

.fh-cat + .fh-cat {
    margin-top: 0.55em;
}

.fh-cat .mk-between {
    margin-bottom: 0.25em;
    color: var(--mk-ink-soft);
    font-size: 0.62em;
}

.fh-cat b {
    color: var(--mk-ink);
    font-weight: 650;
}

.fh-seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-top: 0.8em;
    padding: 0.2em;
    border-radius: 0.8em;
    background: rgba(17, 26, 51, 0.06);
}

.fh-seg span {
    display: grid;
    place-items: center;
    height: 2.1em;
    border-radius: 0.65em;
    color: var(--mk-ink-soft);
    font-size: 0.64em;
    font-weight: 620;
}

.fh-seg span.is-active {
    color: var(--mk-ink);
    background: var(--mk-surface);
    box-shadow: 0 0.1em 0.3em rgba(17, 26, 51, 0.1);
}

.fh-amount {
    display: flex;
    justify-content: center;
    margin: 0.7em 0 0.6em;
}

.fh-cats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4em;
    margin-bottom: 0.7em;
}

.fh-cats > span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
    padding: 0.5em 0 0.45em;
    border: 0.06em solid var(--mk-line);
    border-radius: 0.8em;
    color: var(--mk-ink-soft);
    font-size: 0.6em;
    font-weight: 600;
    background: var(--mk-surface);
}

.fh-cats > span .mk-ico {
    font-size: 1.4em;
}

.fh-cats > span.is-active {
    border-color: rgba(var(--mk-amber), 0.6);
    color: var(--mk-ink);
    box-shadow: 0 0 0 0.2em rgba(var(--mk-amber), 0.14);
}

.fh-field {
    min-height: 2.1em;
    gap: 0.5em;
    padding: 0.3em 0;
}

.fh-field > svg {
    width: 0.9em;
    height: 0.9em;
    color: var(--mk-muted);
}

.fh-field .mk-label {
    flex: 1;
    font-size: 0.64em;
}

.fh-field b {
    font-size: 0.66em;
    font-weight: 640;
}

.fh-hint {
    display: block;
    margin-top: 0.6em;
    color: rgb(var(--mk-amber));
    font-size: 0.58em;
    font-weight: 620;
    text-align: center;
}

.fh-close {
    display: grid;
    place-items: center;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    color: var(--mk-ink-soft);
    background: rgba(17, 26, 51, 0.06);
}

.fh-close svg {
    width: 0.85em;
    height: 0.85em;
}

.fh-save {
    position: absolute;
    right: 1em;
    bottom: 1.3em;
    left: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    height: 2.6em;
    border-radius: 0.9em;
    color: #fff;
    font-size: 0.78em;
    font-weight: 650;
    background: rgb(var(--mk-primary));
    box-shadow: 0 0.8em 1.4em -0.7em rgba(var(--mk-primary), 0.9);
}

.fh-save svg {
    width: 1.1em;
    height: 1.1em;
}

.fh-trend {
    width: 1.2em;
    height: 1.2em;
    margin-left: 0.2em;
    color: rgb(var(--mk-green));
}
</style>
