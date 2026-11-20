<script setup lang="ts">
/**
 * Illustration du hero de la page Fonctionnalités : huit sources financières reliées à Spend.Up.
 * Dessinée en SVG dans la grammaire suisse du site (filets fins, noir, rouge, bleu de marque).
 * Les traits rouges avancent vers le centre ; ils restent immobiles si prefers-reduced-motion.
 */

interface SourceNode {
    x: number;
    y: number;
    label: string;
    meta: string;
    accent: 'red' | 'primary' | 'ink';
}

const CENTER = { x: 320, y: 280 };
const NODE_W = 164;
const NODE_H = 58;

const nodes: SourceNode[] = [
    { x: 320, y: 46, label: 'Compte courant', meta: '12 480.00 CHF', accent: 'ink' },
    { x: 530, y: 120, label: 'Carte de crédit', meta: '•••• 4821', accent: 'primary' },
    { x: 556, y: 280, label: 'TWINT', meta: '− 18.50 CHF', accent: 'red' },
    { x: 530, y: 440, label: 'Abonnement', meta: '18.90 CHF / mois', accent: 'primary' },
    { x: 320, y: 514, label: 'Justificatif', meta: 'facture-mai.pdf', accent: 'ink' },
    { x: 110, y: 440, label: 'Salaire', meta: '+ 6 200.00 CHF', accent: 'red' },
    { x: 84, y: 280, label: 'Relevé importé', meta: 'releve.csv · 142 lignes', accent: 'primary' },
    { x: 110, y: 120, label: 'Patrimoine', meta: 'Immobilier · Placements', accent: 'ink' }
];

const accentColor: Record<SourceNode['accent'], string> = {
    red: '#d0021b',
    primary: '#5d87ff',
    ink: '#111111'
};
</script>

<template>
    <svg
        class="features-hero-visual"
        viewBox="0 0 640 560"
        role="img"
        aria-label="Comptes, cartes, TWINT, relevés, justificatifs, abonnements, salaire et patrimoine réunis dans Spend.Up"
    >
        <!-- Liaisons : filet gris fixe, trait rouge qui avance de la source vers le centre -->
        <g class="features-hero-visual__links">
            <template v-for="(node, index) in nodes" :key="`link-${index}`">
                <line :x1="node.x" :y1="node.y" :x2="CENTER.x" :y2="CENTER.y" stroke="#cfcfcd" stroke-width="1" />
                <line
                    class="features-hero-visual__pulse"
                    :x1="node.x"
                    :y1="node.y"
                    :x2="CENTER.x"
                    :y2="CENTER.y"
                    pathLength="100"
                    stroke="#d0021b"
                    stroke-width="2"
                    :style="{ animationDelay: `${index * -0.45}s` }"
                />
            </template>
        </g>

        <!-- Sources -->
        <g v-for="(node, index) in nodes" :key="`node-${index}`" class="features-hero-visual__node">
            <rect :x="node.x - NODE_W / 2" :y="node.y - NODE_H / 2" :width="NODE_W" :height="NODE_H" fill="#ffffff" stroke="#dedede" />
            <rect :x="node.x - NODE_W / 2" :y="node.y - NODE_H / 2" width="4" :height="NODE_H" :fill="accentColor[node.accent]" />
            <text :x="node.x - NODE_W / 2 + 18" :y="node.y - 4" class="features-hero-visual__label">{{ node.label }}</text>
            <text :x="node.x - NODE_W / 2 + 18" :y="node.y + 15" class="features-hero-visual__meta">{{ node.meta }}</text>
        </g>

        <!-- Centre : le logo Spend.Up (version fond noir de public/brand), puis la vue qui en résulte -->
        <g class="features-hero-visual__hub">
            <rect :x="CENTER.x - 105" :y="CENTER.y - 75" width="210" height="150" fill="#0b0c10" />

            <!-- Pictogramme : cartes empilées, repris de spendup-icone-noir.svg sans son fond -->
            <svg :x="CENTER.x - 69" :y="CENTER.y - 48.6" width="25.5" height="21.2" viewBox="200 250 600 500" aria-hidden="true">
                <g transform="translate(210 268) translate(-140 -196)">
                    <g transform="rotate(-21 300 650)"><rect x="260" y="310" width="420" height="280" fill="#3a3d47" /></g>
                    <g transform="rotate(-14 300 650)"><rect x="272" y="324" width="420" height="280" fill="#3a3d47" /></g>
                    <g transform="rotate(-7 300 650)"><rect x="284" y="338" width="420" height="280" fill="#ffffff" /></g>
                    <rect x="300" y="370" width="420" height="290" fill="#5d87ff" />
                    <rect x="350.4" y="422.2" width="79.8" height="63.8" fill="#0b0c10" />
                    <rect x="350.4" y="573" width="168" height="26.1" fill="#0b0c10" />
                </g>
            </svg>
            <!-- prettier-ignore -->
            <text :x="CENTER.x - 34.5" :y="CENTER.y - 29.4" class="features-hero-visual__hub-brand">Spend<tspan fill="#5d87ff">.</tspan>Up</text>

            <line :x1="CENTER.x - 87" :y1="CENTER.y" :x2="CENTER.x + 87" :y2="CENTER.y" stroke="#ffffff" stroke-opacity="0.18" />
            <text :x="CENTER.x" :y="CENTER.y + 26" text-anchor="middle" class="features-hero-visual__hub-meta">Patrimoine net</text>
            <text :x="CENTER.x" :y="CENTER.y + 52" text-anchor="middle" class="features-hero-visual__hub-value">48 210 CHF</text>
        </g>
    </svg>
</template>

<style scoped lang="scss">
.features-hero-visual {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    font-family: 'Helvetica Neue', Helvetica, Arial, 'Nimbus Sans', sans-serif;

    &__label {
        fill: #111111;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: -0.01em;
    }

    &__meta {
        fill: #6f6f6f;
        font-size: 12px;
    }

    &__hub-brand {
        fill: #ffffff;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.045em;
    }

    &__hub-meta {
        fill: rgba(255, 255, 255, 0.65);
        font-size: 12px;
    }

    &__hub-value {
        fill: #ffffff;
        font-size: 20px;
        font-weight: 700;
    }

    &__pulse {
        stroke-dasharray: 8 92;
        stroke-dashoffset: 100;
        animation: features-hero-pulse 3.6s linear infinite;
    }
}

@keyframes features-hero-pulse {
    to {
        stroke-dashoffset: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .features-hero-visual__pulse {
        animation: none;
        stroke-dashoffset: 50;
    }
}
</style>
