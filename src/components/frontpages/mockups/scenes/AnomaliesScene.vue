<script setup lang="ts">
/**
 * Parcours « Anomalies & qualité des données » : alertes détectées automatiquement
 * (doublon, facture en hausse, montant inhabituel) et score de qualité.
 */
import { AlertTriangleIcon, CircleCheckIcon, CopyIcon, ListCheckIcon, TrendingUpIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';

const alerts = [
    {
        icon: CopyIcon,
        tone: 'red',
        title: 'Doublon possible',
        detail: 'Coop Pronto · CHF 12.80 × 2 · 14 sept.',
        status: 'Nouvelle',
        actions: ['Ignorer', 'Fusionner'],
        resolved: false
    },
    {
        icon: TrendingUpIcon,
        tone: 'amber',
        title: 'Facture en hausse',
        detail: 'Électricité · + 38 % vs moyenne sur 12 mois',
        status: 'Confirmée',
        actions: ['Ignorer', 'Voir l’historique'],
        resolved: false
    },
    {
        icon: AlertTriangleIcon,
        tone: 'green',
        title: 'Montant inhabituel',
        detail: 'Achat en ligne · CHF 1’249.00 · 9 sept.',
        status: 'Résolue',
        actions: [],
        resolved: true
    }
];

const rules = [
    { name: 'Doublons', on: true },
    { name: 'Hausses de factures', on: true },
    { name: 'Montants inhabituels', on: true },
    { name: 'Sans catégorie', on: false }
];

/* anneau 98 % : circonférence d'un cercle r = 15 */
const ring = 2 * Math.PI * 15;
</script>

<template>
    <MockStage
        label="Contrôle des données dans Spend.Up : doublon possible, facture en hausse et montant inhabituel, avec un score de qualité de 98 %"
    >
        <MockWindow title="Spend.Up · Contrôle des données" style="left: 1.2em; top: 2em; width: 30.8em; height: 30.5em">
            <div class="mk-between" style="margin-bottom: 0.9em">
                <div>
                    <span class="mk-eyebrow">Septembre 2026</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Contrôle des données</span>
                </div>
                <span class="mk-chip mk-tone-red">2 à traiter</span>
            </div>

            <div class="ano-list">
                <div v-for="alert in alerts" :key="alert.title" class="mk-card ano-card" :class="{ 'is-resolved': alert.resolved }">
                    <div class="mk-flex" style="gap: 0.75em">
                        <span class="mk-ico" :class="`mk-tone-${alert.tone}`"><component :is="alert.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.84em">{{ alert.title }}</span>
                            <span class="mk-sub" style="margin-top: 0.2em">{{ alert.detail }}</span>
                        </div>
                        <span class="mk-chip mk-chip--solid" :class="`mk-tone-${alert.tone}`">{{ alert.status }}</span>
                    </div>
                    <div class="ano-actions">
                        <template v-if="alert.resolved">
                            <span class="ano-done"><CircleCheckIcon />Achat confirmé comme légitime · 10 sept.</span>
                        </template>
                        <template v-else>
                            <span
                                v-for="(action, index) in alert.actions"
                                :key="action"
                                class="ano-btn"
                                :class="{ 'ano-btn--primary': index === 1 }"
                            >
                                {{ action }}
                            </span>
                        </template>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-float mk-bob" style="left: 32.6em; top: 3.4em">
            <svg class="ano-ring" viewBox="0 0 36 36">
                <defs>
                    <linearGradient id="mk-ano-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="rgb(19,170,128)" />
                        <stop offset="1" stop-color="rgb(73,190,255)" />
                    </linearGradient>
                </defs>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(17,26,51,0.08)" stroke-width="4" />
                <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="url(#mk-ano-ring)"
                    stroke-width="4"
                    stroke-linecap="round"
                    :stroke-dasharray="`${ring * 0.98} ${ring}`"
                    transform="rotate(-90 18 18)"
                />
            </svg>
            <div>
                <span class="mk-title">Qualité des données</span>
                <span class="ano-score">98 %</span>
            </div>
        </div>

        <div class="mk-card mk-card--pad" style="left: 33.4em; top: 10.6em; width: 11.4em">
            <div class="mk-flex" style="margin-bottom: 0.6em">
                <span class="mk-ico mk-ico--sm mk-tone-primary"><ListCheckIcon /></span>
                <span class="mk-title" style="font-size: 0.8em">Détection</span>
            </div>
            <div v-for="rule in rules" :key="rule.name" class="ano-rule">
                <span>{{ rule.name }}</span>
                <i class="ano-toggle" :class="{ 'is-on': rule.on }"></i>
            </div>
        </div>

        <div class="mk-card mk-card--pad" style="left: 33.4em; top: 23.4em; width: 11.4em">
            <span class="mk-label">Analysées ce mois</span>
            <span class="mk-kpi" style="font-size: 1.4em; margin-top: 0.15em">1’284</span>
            <span class="mk-label" style="margin-top: 0.1em">transactions · 3 alertes</span>
        </div>
    </MockStage>
</template>

<style scoped>
.ano-list {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
}

.ano-card {
    position: relative;
    padding: 1em 1.1em 0.9em;
}

.ano-card.is-resolved {
    background: rgba(255, 255, 255, 0.7);
}

.ano-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
    margin-top: 0.8em;
    padding-top: 0.75em;
    border-top: 0.06em solid var(--mk-line);
}

.ano-btn {
    display: inline-flex;
    align-items: center;
    height: 2.1em;
    padding: 0 1em;
    border: 0.08em solid var(--mk-line);
    border-radius: 0.7em;
    color: var(--mk-ink-soft);
    background: var(--mk-surface);
    font-size: 0.66em;
    font-weight: 640;
}

.ano-btn--primary {
    border-color: transparent;
    color: #fff;
    background: rgb(var(--mk-primary));
    box-shadow: 0 0.6em 1em -0.6em rgba(var(--mk-primary), 0.9);
}

.ano-done {
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
    height: 2.1em;
    margin-right: auto;
    color: rgb(var(--mk-green));
    font-size: 0.66em;
    font-weight: 620;
}

.ano-done svg {
    width: 1.3em;
    height: 1.3em;
}

.ano-ring {
    width: 2.6em;
    height: 2.6em;
}

.ano-score {
    display: block;
    margin-top: 0.05em;
    color: rgb(var(--mk-green));
    font-size: 1.05em;
    font-weight: 720;
    letter-spacing: -0.02em;
}

.ano-rule {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    padding: 0.5em 0;
    color: var(--mk-ink-soft);
    font-size: 0.68em;
    font-weight: 580;
}

.ano-rule + .ano-rule {
    border-top: 0.09em solid var(--mk-line);
}

.ano-toggle {
    position: relative;
    flex: none;
    width: 2.3em;
    height: 1.3em;
    border-radius: 99em;
    background: rgba(17, 26, 51, 0.14);
}

.ano-toggle::after {
    content: '';
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1em;
    height: 1em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0.1em 0.2em rgba(17, 26, 51, 0.25);
}

.ano-toggle.is-on {
    background: rgb(var(--mk-green));
}

.ano-toggle.is-on::after {
    left: auto;
    right: 0.15em;
}
</style>
