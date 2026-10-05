<script setup lang="ts">
/**
 * Parcours « Dépenses récurrentes & abonnements » : liste des abonnements (mobile),
 * calendrier des prochains prélèvements (desktop) et détection d’abonnement inutilisé.
 */
import { ArrowsExchangeIcon, BarbellIcon, ChartPieIcon, HomeIcon, MenuIcon, MusicIcon, PlusIcon, UmbrellaIcon } from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { chf, swissNumber } from '../format';

const subscriptions = [
    { initials: 'SV', tone: 'red', name: 'Streaming vidéo', label: 'Le 12 du mois', amount: 21.9 },
    { initials: 'MU', tone: 'green', name: 'Musique', label: 'Le 4 du mois', amount: 12.95 },
    { initials: 'FM', tone: 'primary', name: 'Forfait mobile', label: 'Le 20 du mois', amount: 39 },
    { initials: 'SC', tone: 'teal', name: 'Stockage cloud', label: 'Le 8 du mois', amount: 9.9 },
    { initials: 'SS', tone: 'amber', name: 'Salle de sport', label: 'Le 25 du mois', amount: 69 },
    { initials: 'PL', tone: 'violet', name: 'Presse en ligne', label: 'Le 15 du mois', amount: 33.75 }
];

const monthly = subscriptions.reduce((sum, item) => sum + item.amount, 0);

const days = [
    { name: 'lun.', num: 28, today: true },
    { name: 'mar.', num: 29 },
    { name: 'mer.', num: 30 },
    { name: 'jeu.', num: 1, debit: true, month: 'oct.' },
    { name: 'ven.', num: 2 },
    { name: 'sam.', num: 3 },
    { name: 'dim.', num: 4, dot: true }
];
</script>

<template>
    <MockStage
        label="Abonnements et dépenses récurrentes dans Spend.Up : CHF 186.50 par mois, calendrier des prochains prélèvements et abonnement inutilisé détecté"
    >
        <MockPhone class="mk-bob" style="left: 3.4em; top: 1.75em">
            <span class="mk-eyebrow">Dépenses récurrentes</span>
            <span class="mk-title" style="font-size: 1.05em; margin-top: 0.15em">Abonnements</span>
            <span class="mk-kpi" style="font-size: 1.55em; margin-top: 0.45em">
                <small>CHF</small>{{ swissNumber(monthly) }}<span class="sub-per">/ mois</span>
            </span>
            <span class="mk-label" style="margin-top: 0.2em">6 actifs · {{ chf(monthly * 12) }} par an</span>

            <div class="mk-card" style="position: relative; margin-top: 0.8em; padding: 0.15em 0.75em">
                <div class="mk-list">
                    <div
                        v-for="item in subscriptions"
                        :key="item.name"
                        class="mk-row"
                        style="min-height: 2.45em; padding: 0.3em 0; gap: 0.55em"
                    >
                        <span class="sub-tile" :class="`mk-tone-${item.tone}`">{{ item.initials }}</span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.72em">{{ item.name }}</span>
                            <span class="mk-label" style="font-size: 0.58em">{{ item.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount" style="font-size: 0.68em">{{ swissNumber(item.amount) }}</span>
                    </div>
                </div>
            </div>

            <nav class="mk-tabbar">
                <span><HomeIcon /></span>
                <span class="is-active"><ArrowsExchangeIcon /></span>
                <span class="mk-tabbar__add"><PlusIcon /></span>
                <span><ChartPieIcon /></span>
                <span><MenuIcon /></span>
            </nav>
        </MockPhone>

        <MockWindow title="Spend.Up · Prochains prélèvements" style="left: 20.6em; top: 4.4em; width: 24.2em; height: 17.4em">
            <div class="mk-between" style="margin-bottom: 0.8em">
                <div>
                    <span class="mk-eyebrow">Cette semaine</span>
                    <span class="mk-title" style="font-size: 1.05em; margin-top: 0.2em">Prochains prélèvements</span>
                </div>
            </div>

            <div class="sub-strip">
                <span v-for="day in days" :key="day.num" class="sub-day" :class="{ 'is-today': day.today, 'is-debit': day.debit }">
                    <b>{{ day.name }}</b>
                    <strong>{{ day.num }}</strong>
                    <i v-if="day.debit || day.dot"></i>
                </span>
            </div>

            <div class="mk-card" style="position: relative; margin-top: 0.8em; padding: 0.3em 0.95em">
                <div class="mk-list">
                    <div class="mk-row">
                        <span class="mk-ico mk-ico--sm mk-tone-amber"><UmbrellaIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">Assurance ménage</span>
                            <span class="mk-label">Annuel · jeu. 1er oct.</span>
                        </div>
                        <div class="mk-row__end">
                            <span class="mk-amount" style="display: block">{{ chf(248) }}</span>
                            <span class="mk-chip mk-tone-amber" style="margin-top: 0.3em">dans 3 jours</span>
                        </div>
                    </div>
                    <div class="mk-row">
                        <span class="mk-ico mk-ico--sm mk-tone-green"><MusicIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">Musique</span>
                            <span class="mk-label">Mensuel · dim. 4 oct.</span>
                        </div>
                        <div class="mk-row__end">
                            <span class="mk-amount" style="display: block">{{ chf(12.95) }}</span>
                            <span class="mk-label" style="margin-top: 0.2em">dans 6 jours</span>
                        </div>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob mk-bob--late" style="left: 17.2em; top: 24.2em">
            <span class="mk-ico mk-tone-red"><BarbellIcon /></span>
            <div>
                <span class="mk-title">Abonnement inutilisé détecté</span>
                <span class="mk-label">Salle de sport · aucune visite depuis 6 semaines</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.sub-per {
    margin-left: 0.3em;
    color: var(--mk-muted);
    font-size: 0.42em;
    font-weight: 620;
    letter-spacing: 0;
}

.sub-tile {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 2.8em;
    height: 2.8em;
    border-radius: 0.9em;
    color: #fff;
    font-size: 0.62em;
    font-weight: 700;
    background: linear-gradient(145deg, rgb(var(--tone)), rgba(var(--tone), 0.72));
}

.sub-strip {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.35em;
}

.sub-day {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15em;
    padding: 0.55em 0 0.75em;
    border: 0.06em solid var(--mk-line);
    border-radius: 0.8em;
    background: var(--mk-surface);
}

.sub-day b {
    color: var(--mk-muted);
    font-size: 0.56em;
    font-weight: 620;
}

.sub-day strong {
    font-size: 0.9em;
    font-weight: 700;
}

.sub-day i {
    position: absolute;
    bottom: 0.3em;
    width: 0.32em;
    height: 0.32em;
    border-radius: 50%;
    background: rgb(var(--mk-green));
}

.sub-day.is-today {
    border-color: rgba(var(--mk-primary), 0.5);
}

.sub-day.is-today strong {
    color: rgb(var(--mk-primary));
}

.sub-day.is-debit {
    border-color: transparent;
    color: #fff;
    background: linear-gradient(160deg, rgb(var(--mk-amber)), #f5b95a);
    box-shadow: 0 0.8em 1.4em -0.8em rgba(var(--mk-amber), 0.95);
}

.sub-day.is-debit b {
    color: rgba(255, 255, 255, 0.85);
}

.sub-day.is-debit i {
    background: #fff;
}
</style>
