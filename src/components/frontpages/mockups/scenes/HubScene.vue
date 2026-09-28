<script setup lang="ts">
/**
 * « 19 domaines financiers. Une seule vision » : tableau de bord central relié aux domaines
 * (comptes, budgets, objectifs, patrimoine…) par des connecteurs discrets.
 */
import {
    BuildingBankIcon,
    CalendarDueIcon,
    ChartLineIcon,
    ChartPieIcon,
    DiamondIcon,
    FileTextIcon,
    TargetIcon,
    UsersIcon
} from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';

const center = { x: 23, y: 17.25 };

const nodes = [
    { icon: BuildingBankIcon, tone: 'primary', label: 'Comptes', x: 7.6, y: 3.4 },
    { icon: ChartPieIcon, tone: 'amber', label: 'Budgets', x: 23, y: 2.6 },
    { icon: TargetIcon, tone: 'green', label: 'Objectifs', x: 38.4, y: 3.4 },
    { icon: DiamondIcon, tone: 'violet', label: 'Patrimoine', x: 5.9, y: 17.25 },
    { icon: ChartLineIcon, tone: 'teal', label: 'Placements', x: 40.1, y: 17.25 },
    { icon: CalendarDueIcon, tone: 'red', label: 'Échéances', x: 7.6, y: 31.1 },
    { icon: FileTextIcon, tone: 'slate', label: 'Documents', x: 23, y: 31.9 },
    { icon: UsersIcon, tone: 'secondary', label: 'Famille', x: 38.4, y: 31.1 }
];

const budgets = [true, true, false, true, true];
</script>

<template>
    <MockStage
        label="Tableau de bord Spendup relié à huit domaines financiers : comptes, budgets, objectifs, patrimoine, placements, échéances, documents et famille"
    >
        <svg class="hub-links" viewBox="0 0 46 34.5" preserveAspectRatio="none">
            <g v-for="n in nodes" :key="n.label">
                <line :x1="n.x" :y1="n.y" :x2="center.x" :y2="center.y" />
            </g>
        </svg>

        <MockWindow title="Spendup · Vue d’ensemble" style="left: 12.5em; top: 6.9em; width: 21em; height: 20.7em">
            <div class="mk-between" style="margin-bottom: 0.7em">
                <div>
                    <span class="mk-eyebrow">Vue d’ensemble</span>
                    <span class="mk-title" style="margin-top: 0.15em">Octobre 2026</span>
                </div>
                <span class="mk-chip mk-tone-primary">19 domaines</span>
            </div>

            <div class="mk-card" style="position: relative; padding: 0.8em 0.9em 0.5em">
                <div class="mk-between">
                    <span class="mk-label">Patrimoine net</span>
                    <span class="mk-delta mk-delta--up">▲ 1.8 % ce mois</span>
                </div>
                <span class="mk-kpi" style="font-size: 1.45em; margin-top: 0.1em"><small>CHF</small>486’200</span>
                <svg class="mk-spark" viewBox="0 0 120 30" style="height: 2.6em; margin-top: 0.3em">
                    <defs>
                        <linearGradient id="hub-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="rgb(139,108,245)" stop-opacity="0.26" />
                            <stop offset="1" stop-color="rgb(139,108,245)" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    <path d="M0 24 L15 22 L30 23 L45 17 L60 18 L75 12 L90 13 L105 7 L120 5 L120 30 L0 30 Z" fill="url(#hub-fill)" />
                    <path
                        d="M0 24 L15 22 L30 23 L45 17 L60 18 L75 12 L90 13 L105 7 L120 5"
                        fill="none"
                        stroke="rgb(139,108,245)"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </div>

            <div class="hub-duo">
                <div class="mk-card" style="position: relative; padding: 0.75em 0.85em">
                    <span class="mk-label">Dépenses d’octobre</span>
                    <span class="mk-kpi" style="font-size: 1.05em; margin: 0.2em 0 0.5em"><small>CHF</small>3’912</span>
                    <div class="mk-bar mk-tone-amber"><i style="width: 85%"></i></div>
                    <span class="mk-label" style="margin-top: 0.4em; font-size: 0.6em">85 % de CHF 4’600</span>
                </div>
                <div class="mk-card" style="position: relative; padding: 0.75em 0.85em">
                    <span class="mk-label">Budgets</span>
                    <span class="mk-kpi" style="font-size: 1.05em; margin: 0.2em 0 0.5em"
                        >4/5 <small style="margin: 0">respectés</small></span
                    >
                    <div class="hub-seg">
                        <i v-for="(ok, i) in budgets" :key="i" :class="ok ? 'mk-tone-green' : 'mk-tone-red'"></i>
                    </div>
                    <span class="mk-label" style="margin-top: 0.4em; font-size: 0.6em">Loisirs : + CHF 48</span>
                </div>
            </div>
        </MockWindow>

        <div v-for="n in nodes" :key="n.label" class="mk-card hub-node" :style="{ left: `${n.x}em`, top: `${n.y}em` }">
            <span class="mk-ico mk-ico--sm" :class="`mk-tone-${n.tone}`"><component :is="n.icon" /></span>
            <span class="mk-title">{{ n.label }}</span>
        </div>
    </MockStage>
</template>

<style scoped>
.hub-links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}

.hub-links line {
    stroke: rgba(93, 135, 255, 0.45);
    stroke-width: 0.08;
    stroke-dasharray: 0.35 0.3;
    stroke-linecap: round;
}

.hub-node {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.45em 0.85em 0.45em 0.45em;
    border-radius: 0.95em;
    white-space: nowrap;
    transform: translate(-50%, -50%);
}

.hub-node .mk-title {
    font-size: 0.78em;
}

.hub-duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6em;
    margin-top: 0.6em;
}

.hub-seg {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.2em;
}

.hub-seg i {
    height: 0.5em;
    border-radius: 99em;
    background: rgb(var(--tone));
}
</style>
