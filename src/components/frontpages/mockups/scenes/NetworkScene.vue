<script setup lang="ts">
/**
 * Parcours « Réseau, tiers & moyens de paiement » : répertoire des tiers (desktop)
 * et portefeuille de moyens de paiement empilés.
 */
import { SearchIcon, UserCheckIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';

const parties = [
    {
        initials: 'RL',
        tone: 'violet',
        name: 'Régie du Léman',
        label: 'Lausanne · loyer',
        type: 'Entreprise',
        typeTone: 'primary',
        count: 9
    },
    {
        initials: 'JM',
        tone: 'red',
        name: 'Julie Morel',
        label: 'Remboursements TWINT',
        type: 'Personne · amie',
        typeTone: 'green',
        count: 14
    },
    {
        initials: 'GF',
        tone: 'amber',
        name: 'Garage Favre SA',
        label: 'Morges · entretien voiture',
        type: 'Entreprise',
        typeTone: 'primary',
        count: 3
    },
    {
        initials: 'CM',
        tone: 'teal',
        name: 'Caisse maladie',
        label: 'Primes LAMal & remboursements',
        type: 'Organisation',
        typeTone: 'violet',
        count: 11
    }
];

const methods = [
    { name: 'Visa ••42', label: 'Carte de crédit', variant: 'visa', meta: '09/29', chip: true },
    { name: 'Carte de débit ••17', label: 'Compte privé', variant: 'debit', meta: '04/28', chip: true },
    { name: 'TWINT', label: 'Paiement mobile', variant: 'twint', meta: '+41 79 ••• •• 18', chip: false },
    { name: 'Espèces', label: 'Porte-monnaie', variant: 'cash', meta: 'CHF 180.00', chip: false }
];
</script>

<template>
    <MockStage label="Répertoire des tiers liés aux transactions et moyens de paiement dans Spend.Up : cartes, TWINT et espèces">
        <MockWindow title="Spend.Up · Tiers" style="left: 1.2em; top: 4em; width: 28.4em; height: 23.8em">
            <div class="mk-between" style="margin-bottom: 0.8em">
                <div>
                    <span class="mk-eyebrow">Réseau</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Tiers</span>
                </div>
                <span class="net-search"><SearchIcon />Rechercher un tiers</span>
            </div>
            <div class="mk-card" style="position: relative; padding: 0.4em 1em">
                <div class="mk-list">
                    <div v-for="party in parties" :key="party.name" class="mk-row" style="min-height: 3.6em">
                        <span class="mk-avatar" :class="`mk-tone-${party.tone}`">{{ party.initials }}</span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ party.name }}</span>
                            <span class="mk-label">{{ party.label }}</span>
                        </div>
                        <span class="mk-chip" :class="`mk-tone-${party.typeTone}`">{{ party.type }}</span>
                        <span class="net-count">
                            <b>{{ party.count }}</b>
                            <span>transactions</span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="mk-between net-foot">
                <span class="mk-label">4 tiers · 37 transactions liées</span>
                <span class="mk-label">Classés par activité</span>
            </div>
        </MockWindow>

        <div class="mk-abs" style="left: 31.2em; top: 3.5em"><span class="mk-eyebrow">Moyens de paiement</span></div>
        <div class="net-stack">
            <div
                v-for="(method, index) in methods"
                :key="method.name"
                class="net-card"
                :class="`net-card--${method.variant}`"
                :style="{ top: `${index * 3.9}em` }"
            >
                <div class="mk-between">
                    <div>
                        <span class="net-card__name">{{ method.name }}</span>
                        <span class="net-card__label">{{ method.label }}</span>
                    </div>
                    <span v-if="method.chip" class="net-card__chip"></span>
                </div>
                <span class="net-card__meta">{{ method.meta }}</span>
            </div>
        </div>

        <div class="mk-float mk-bob" style="left: 28.4em; top: 27.2em">
            <span class="mk-ico mk-tone-green"><UserCheckIcon /></span>
            <div>
                <span class="mk-title">Demande d’ami acceptée</span>
                <span class="mk-label">Julie Morel · dépenses partagées</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.net-search {
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
    height: 2.3em;
    margin-right: 0.2em;
    padding: 0 0.9em;
    border: 0.06em solid var(--mk-line);
    border-radius: 99em;
    color: var(--mk-muted);
    background: var(--mk-surface);
    font-size: 0.66em;
    font-weight: 560;
}

.net-search svg {
    width: 1.2em;
    height: 1.2em;
}

.net-count {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: flex-end;
    width: 4.2em;
}

.net-count b {
    font-size: 0.86em;
    font-weight: 700;
}

.net-count span {
    color: var(--mk-muted);
    font-size: 0.58em;
    font-weight: 560;
}

.net-foot {
    margin-top: 0.8em;
    padding: 0 0.3em;
}

.net-stack {
    position: absolute;
    left: 31.2em;
    top: 4.9em;
    width: 13.6em;
    height: 20.2em;
}

.net-card {
    position: absolute;
    left: 0;
    width: 100%;
    height: 8.5em;
    padding: 0.95em 1.05em;
    border-radius: 1em;
    color: #fff;
    box-shadow:
        0 -0.1em 0 rgba(255, 255, 255, 0.25) inset,
        0 1.2em 2em -1em rgba(17, 26, 51, 0.55);
    overflow: hidden;
}

.net-card::after {
    content: '';
    position: absolute;
    right: -3em;
    bottom: -4.5em;
    width: 9em;
    height: 9em;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
}

.net-card--visa {
    background: linear-gradient(135deg, #243056, #3b4f8f);
}

.net-card--debit {
    background: linear-gradient(135deg, rgb(var(--mk-primary)), rgb(var(--mk-secondary)));
}

.net-card--twint {
    background: linear-gradient(135deg, #1b1f2b, #3a3f4f);
}

.net-card--cash {
    background: linear-gradient(135deg, rgb(var(--mk-green)), #4fcfa2);
}

.net-card__name {
    display: block;
    font-size: 0.86em;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.net-card__label {
    display: block;
    margin-top: 0.15em;
    font-size: 0.62em;
    font-weight: 560;
    opacity: 0.8;
}

.net-card__chip {
    width: 1.9em;
    height: 1.4em;
    border-radius: 0.3em;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.35));
}

.net-card__meta {
    position: absolute;
    left: 1.05em;
    bottom: 0.95em;
    font-size: 0.7em;
    font-weight: 620;
    letter-spacing: 0.04em;
    opacity: 0.9;
}
</style>
