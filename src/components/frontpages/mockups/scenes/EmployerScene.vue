<script setup lang="ts">
/**
 * Parcours « Employeurs, contrats & salaires » : fiche de salaire détaillée (desktop),
 * contrat de travail, cumul net de l’année et certificat de salaire.
 */
import { BriefcaseIcon, BuildingBankIcon, CalendarStatsIcon, FileCertificateIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { chf, swissNumber } from '../format';

const gross = 7140;

const deductions = [
    { title: 'AVS / AI / APG', label: 'Assurances sociales · 5.30 %', amount: 378.42 },
    { title: 'AC', label: 'Assurance chômage · 1.10 %', amount: 78.54 },
    { title: 'LPP', label: 'Prévoyance professionnelle', amount: 351.9 },
    { title: 'AANP', label: 'Accidents non professionnels', amount: 81.14 }
];

const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
const net = gross - totalDeductions;

const contract = [
    { key: 'Poste', value: 'Consultant senior' },
    { key: 'Taux d’activité', value: '100 %' },
    { key: 'Depuis', value: 'mars 2023' },
    { key: '13e salaire', value: 'Oui' }
];

/* Salaire net versé de janvier à septembre 2026 (hauteur relative des barres) */
const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S'];
</script>

<template>
    <MockStage
        label="Fiche de salaire de septembre 2026 avec le détail des déductions sociales, contrat de travail et certificat de salaire dans Spendup"
    >
        <MockWindow
            title="Fiche de salaire · Septembre 2026 · Alpina Conseil SA"
            style="left: 1.2em; top: 1.6em; width: 28.8em; height: 30.9em"
        >
            <div class="mk-between" style="margin-bottom: 0.8em">
                <div>
                    <span class="mk-eyebrow">Alpina Conseil SA · Lausanne</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Septembre 2026</span>
                </div>
                <span class="mk-chip mk-tone-green">Versé le 25 sept.</span>
            </div>

            <div class="mk-card" style="position: relative; padding: 0.3em 1em">
                <div class="mk-list">
                    <div class="mk-row emp-row">
                        <span class="mk-ico mk-ico--sm mk-tone-primary"><BriefcaseIcon /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">Salaire brut</span>
                            <span class="mk-label">Mensuel · 100 %</span>
                        </div>
                        <span class="mk-row__end mk-amount">{{ chf(gross) }}</span>
                    </div>
                    <div v-for="line in deductions" :key="line.title" class="mk-row emp-row">
                        <span class="emp-rate"></span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ line.title }}</span>
                            <span class="mk-label">{{ line.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount emp-minus">− {{ swissNumber(line.amount) }}</span>
                    </div>
                    <div class="mk-row emp-row">
                        <span class="emp-rate emp-rate--total"></span>
                        <div class="mk-row__main">
                            <span class="mk-title">Total des déductions</span>
                            <span class="mk-label">12.47 % du brut</span>
                        </div>
                        <span class="mk-row__end mk-amount emp-minus">− {{ swissNumber(totalDeductions) }}</span>
                    </div>
                </div>
            </div>

            <div class="emp-net">
                <div>
                    <span class="emp-net__label">Salaire net</span>
                    <span class="emp-net__kpi"><small>CHF</small>{{ swissNumber(net) }}</span>
                </div>
                <div class="emp-net__to">
                    <BuildingBankIcon />
                    <span>Viré sur UBS<br />Compte privé</span>
                </div>
            </div>
        </MockWindow>

        <div class="mk-card mk-card--pad" style="left: 31.6em; top: 3.2em; width: 13.2em">
            <div class="mk-between" style="margin-bottom: 0.7em">
                <div class="mk-flex">
                    <span class="mk-ico mk-ico--sm mk-tone-violet"><BriefcaseIcon /></span>
                    <span class="mk-title">Contrat</span>
                </div>
                <span class="mk-chip mk-tone-green">Actif</span>
            </div>
            <div v-for="item in contract" :key="item.key" class="emp-kv">
                <span class="mk-label">{{ item.key }}</span>
                <span class="emp-kv__value">{{ item.value }}</span>
            </div>
        </div>

        <div class="mk-card mk-card--pad" style="left: 31.6em; top: 16.6em; width: 13.2em">
            <div class="mk-flex" style="margin-bottom: 0.5em">
                <span class="mk-ico mk-ico--sm mk-tone-teal"><CalendarStatsIcon /></span>
                <span class="mk-label">Net cumulé 2026</span>
            </div>
            <span class="mk-kpi" style="font-size: 1.35em"><small>CHF</small>{{ swissNumber(net * 9) }}</span>
            <div class="emp-bars">
                <span v-for="(month, index) in months" :key="index" class="emp-bars__col">
                    <i :class="{ 'is-current': index === months.length - 1 }"></i>
                    <b>{{ month }}</b>
                </span>
            </div>
        </div>

        <div class="mk-float mk-bob" style="left: 30.4em; top: 28.6em">
            <span class="mk-ico mk-tone-amber"><FileCertificateIcon /></span>
            <div>
                <span class="mk-title">Certificat de salaire 2025</span>
                <span class="mk-label">Prêt pour la déclaration d’impôt</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.emp-row {
    min-height: 2.75em;
    padding: 0.35em 0;
}

.emp-rate {
    flex: none;
    width: 1.8em;
    height: 0.3em;
    border-radius: 99em;
    background: rgba(var(--mk-red), 0.28);
}

.emp-rate--total {
    background: rgb(var(--mk-red));
}

.emp-minus {
    color: rgb(var(--mk-red));
}

.emp-net {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.8em;
    padding: 0.85em 1.1em;
    border-radius: 1em;
    color: #fff;
    background: linear-gradient(120deg, rgb(var(--mk-primary)), rgb(var(--mk-secondary)));
    box-shadow: 0 1em 2em -1em rgba(var(--mk-primary), 0.9);
}

.emp-net__label {
    display: block;
    font-size: 0.72em;
    font-weight: 600;
    opacity: 0.85;
}

.emp-net__kpi {
    display: block;
    margin-top: 0.1em;
    font-size: 1.7em;
    font-weight: 720;
    letter-spacing: -0.03em;
    line-height: 1.1;
}

.emp-net__kpi small {
    margin-right: 0.25em;
    font-size: 0.48em;
    font-weight: 620;
    letter-spacing: 0;
    vertical-align: 0.35em;
    opacity: 0.85;
}

.emp-net__to {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em 0.75em;
    border-radius: 0.8em;
    background: rgba(255, 255, 255, 0.18);
    font-size: 0.66em;
    font-weight: 600;
    line-height: 1.3;
}

.emp-net__to svg {
    width: 1.5em;
    height: 1.5em;
}

.emp-kv {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6em;
    min-height: 2.1em;
}

.emp-kv + .emp-kv {
    border-top: 0.06em solid var(--mk-line);
}

.emp-kv__value {
    font-size: 0.74em;
    white-space: nowrap;
    font-weight: 640;
}

.emp-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 3.6em;
    margin-top: 0.8em;
}

.emp-bars__col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3em;
}

.emp-bars__col i {
    width: 0.75em;
    height: 2.4em;
    border-radius: 0.3em;
    background: rgba(var(--mk-teal), 0.25);
}

.emp-bars__col i.is-current {
    background: rgb(var(--mk-teal));
}

.emp-bars__col b {
    color: var(--mk-muted);
    font-size: 0.55em;
    font-weight: 600;
}
</style>
