<script setup lang="ts">
/**
 * Parcours « Au quotidien » : transactions (desktop) + comptes consolidés (mobile) + import PDF.
 */
import {
    ArrowsExchangeIcon,
    BriefcaseIcon,
    BuildingBankIcon,
    BusIcon,
    CashIcon,
    ChartPieIcon,
    CreditCardIcon,
    DeviceMobileIcon,
    FileUploadIcon,
    HomeIcon,
    MenuIcon,
    PigMoneyIcon,
    PlusIcon,
    ShoppingCartIcon
} from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { signedAmount, swissNumber } from '../format';

const transactions = [
    { icon: BriefcaseIcon, tone: 'green', title: 'Salaire · Alpina Conseil SA', label: 'Revenus · 25 sept.', amount: 6250 },
    { icon: ShoppingCartIcon, tone: 'amber', title: 'Migros Lausanne-Flon', label: 'Alimentation · 24 sept.', amount: -84.35 },
    { icon: HomeIcon, tone: 'violet', title: 'Loyer · Régie du Léman', label: 'Logement · 24 sept.', amount: -1890 },
    { icon: BusIcon, tone: 'teal', title: 'CFF · Abonnement demi-tarif', label: 'Transports · 23 sept.', amount: -190 },
    { icon: DeviceMobileIcon, tone: 'primary', title: 'TWINT · Julie M.', label: 'Remboursement · 22 sept.', amount: 32.5 }
];

const accounts = [
    { icon: BuildingBankIcon, tone: 'red', name: 'UBS', label: 'Compte privé', amount: 8412.6 },
    { icon: PigMoneyIcon, tone: 'amber', name: 'PostFinance', label: 'Épargne', amount: 12650 },
    { icon: CreditCardIcon, tone: 'primary', name: 'Visa ••42', label: 'Carte de crédit', amount: -655.2 },
    { icon: CashIcon, tone: 'green', name: 'Espèces', label: 'Porte-monnaie', amount: 180 }
];
</script>

<template>
    <MockStage label="Transactions du mois et comptes consolidés dans Spendup, montants en francs suisses">
        <MockWindow title="Spendup · Transactions" style="left: 1.2em; top: 3.4em; width: 30.5em; height: 23.6em">
            <div class="mk-between" style="margin-bottom: 0.9em">
                <div>
                    <span class="mk-eyebrow">Septembre 2026</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Transactions</span>
                </div>
                <span class="mk-chip mk-tone-green" style="margin-right: 3.2em">+ CHF 4’118.15</span>
            </div>
            <div class="mk-card mk-card--pad" style="position: relative; padding-block: 0.4em">
                <div class="mk-list">
                    <div v-for="tx in transactions" :key="tx.title" class="mk-row">
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${tx.tone}`"><component :is="tx.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ tx.title }}</span>
                            <span class="mk-label">{{ tx.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount" :class="tx.amount > 0 ? 'mk-amount--pos' : 'mk-amount--neg'">
                            {{ signedAmount(tx.amount) }}
                        </span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <MockPhone class="mk-bob" style="left: 29.6em; top: 1.7em">
            <span class="mk-label">Patrimoine disponible</span>
            <span class="mk-kpi" style="font-size: 1.55em; margin-top: 0.15em"><small>CHF</small>20’587.40</span>
            <span class="mk-delta mk-delta--up" style="margin-top: 0.45em">▲ 2.4 % ce mois</span>

            <svg class="mk-spark" viewBox="0 0 120 34" style="margin: 0.9em 0 0.6em; height: 3.2em">
                <defs>
                    <linearGradient id="mk-acc-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="rgb(93,135,255)" stop-opacity="0.28" />
                        <stop offset="1" stop-color="rgb(93,135,255)" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path d="M0 26 L15 24 L30 27 L45 19 L60 21 L75 14 L90 16 L105 8 L120 10 L120 34 L0 34 Z" fill="url(#mk-acc-fill)" />
                <path
                    d="M0 26 L15 24 L30 27 L45 19 L60 21 L75 14 L90 16 L105 8 L120 10"
                    fill="none"
                    stroke="rgb(93,135,255)"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>

            <span class="mk-eyebrow" style="margin-bottom: 0.3em">Mes comptes</span>
            <div class="mk-card" style="position: relative; padding: 0.15em 0.75em">
                <div class="mk-list">
                    <div v-for="account in accounts" :key="account.name" class="mk-row" style="min-height: 2.6em; gap: 0.55em">
                        <span class="mk-accent" :class="`mk-tone-${account.tone}`"></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.74em">{{ account.name }}</span>
                            <span class="mk-label">{{ account.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount" style="font-size: 0.68em">{{ swissNumber(account.amount) }}</span>
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

        <div class="mk-float mk-bob mk-bob--late" style="left: 3em; top: 25.6em">
            <span class="mk-ico mk-tone-red"><FileUploadIcon /></span>
            <div>
                <span class="mk-title">Relevé UBS importé</span>
                <span class="mk-label">42 opérations classées automatiquement</span>
            </div>
        </div>
    </MockStage>
</template>
