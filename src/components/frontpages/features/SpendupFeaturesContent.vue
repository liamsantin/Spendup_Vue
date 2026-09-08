<script setup lang="ts">
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    BuildingBankIcon,
    CalendarIcon,
    ChartLineIcon,
    ChartPieIcon,
    CheckIcon,
    FileInvoiceIcon,
    FolderIcon,
    HomeEcoIcon,
    LayoutDashboardIcon,
    LockIcon,
    RepeatIcon,
    SparklesIcon,
    TagsIcon,
    TargetIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import type { Component } from 'vue';
import { spendupAdditionalDomains } from '@/data/front-pages/spendup-additional-domains';

type FeatureTone = 'success' | 'alert' | 'info';

interface FeatureCard {
    icon: Component;
    title: string;
    text?: string;
    items?: string[];
}

interface FeatureSection {
    id: string;
    number: string;
    kicker: string;
    icon: Component;
    title: string;
    text: string;
    image: string;
    imageAlt: string;
    floats: { label: string; value: string; tone: FeatureTone }[];
    cards: FeatureCard[];
    footer?: string;
}

const journeys = [
    {
        number: '01',
        icon: WalletIcon,
        kicker: 'Au quotidien',
        title: 'Comprenez chaque mouvement de votre argent',
        text: 'Tous vos comptes, moyens de paiement et transactions réunis dans une expérience claire.',
        image: '/assets/images/front-pages/features/feature-imports.png',
        imageAlt: 'Import et organisation de documents financiers',
        floats: [
            { label: 'Import PDF', value: 'Synchronisé', tone: 'success' },
            { label: 'Anomalie', value: 'Détectée', tone: 'alert' },
            { label: 'Comptes liés', value: '4 actifs', tone: 'info' }
        ],
        features: [
            { icon: BuildingBankIcon, title: 'Comptes consolidés', text: 'Banques, cash, wallets et cartes dans une vue unique.' },
            { icon: TagsIcon, title: 'Catégorisation intelligente', text: 'Catégories, tags et règles automatiques selon vos habitudes.' },
            { icon: FolderIcon, title: 'Imports & documents', text: 'Relevés, factures et justificatifs liés à vos opérations.' },
            { icon: AlertTriangleIcon, title: 'Détection d’anomalies', text: 'Doublons, montants inhabituels et variations à surveiller.' }
        ]
    },
    {
        number: '02',
        icon: ChartPieIcon,
        kicker: 'Planifier',
        title: 'Donnez une direction à votre budget',
        text: 'Passez du simple suivi à une vraie capacité d’anticipation financière.',
        image: '/assets/images/front-pages/features/feature-budget.jpg',
        imageAlt: 'Gestion du budget familial et de l’épargne',
        floats: [
            { label: 'Budget courses', value: '82 %', tone: 'info' },
            { label: 'Objectif vacances', value: 'Atteint', tone: 'success' },
            { label: 'Reste à vivre', value: 'CHF 640', tone: 'info' }
        ],
        features: [
            { icon: ChartPieIcon, title: 'Budgets personnalisés', text: 'Limites mensuelles ou annuelles avec suivi par catégorie.' },
            { icon: TargetIcon, title: 'Objectifs d’épargne', text: 'Mesurez vos progrès et planifiez vos projets importants.' },
            { icon: RepeatIcon, title: 'Revenus & charges récurrents', text: 'Anticipez salaires, loyers, crédits et abonnements.' },
            { icon: CalendarIcon, title: 'Calendrier financier', text: 'Échéances, rappels et événements réunis dans le temps.' }
        ]
    },
    {
        number: '03',
        icon: HomeEcoIcon,
        kicker: 'Construire',
        title: 'Pilotez votre patrimoine dans son ensemble',
        text: 'Une lecture consolidée de ce que vous possédez, devez et préparez pour demain.',
        image: '/assets/images/front-pages/features/feature-properties.png',
        imageAlt: 'Suivi des propriétés, véhicules et actifs patrimoniaux',
        floats: [
            { label: 'Patrimoine net', value: '+6.2 %', tone: 'success' },
            { label: 'Immobilier', value: 'CHF 820k', tone: 'info' },
            { label: 'Projection 2030', value: 'Active', tone: 'info' }
        ],
        features: [
            { icon: ChartLineIcon, title: 'Placements & crypto', text: 'Portefeuilles, positions, opérations et valorisations.' },
            { icon: HomeEcoIcon, title: 'Immobilier & actifs', text: 'Biens, lots, baux, véhicules, charges et rendement.' },
            { icon: FileInvoiceIcon, title: 'Fiscalité & revenus', text: 'Employeurs, salaires, retenues et préparation fiscale.' },
            { icon: LayoutDashboardIcon, title: 'Scénarios & projections', text: 'Trésorerie, patrimoine net et santé financière.' }
        ]
    },
    {
        number: '04',
        icon: UsersIcon,
        kicker: 'Partager',
        title: 'Gérez ensemble, sans tout mélanger',
        text: 'Collaborez autour des finances communes en gardant le contrôle de votre espace personnel.',
        image: '/assets/images/front-pages/features/feature-collaboration.jpg',
        imageAlt: 'Collaboration financière entre proches',
        floats: [
            { label: 'Espace Famille', value: '5 membres', tone: 'info' },
            { label: 'Dépense partagée', value: 'Répartie', tone: 'success' },
            { label: 'Vos droits', value: 'Admin', tone: 'info' }
        ],
        features: [
            { icon: UsersIcon, title: 'Espaces partagés', text: 'Famille, couple ou colocation, jusqu’à 5 membres.' },
            { icon: LockIcon, title: 'Rôles & permissions', text: 'Contrôlez précisément qui peut voir ou modifier.' },
            { icon: WalletIcon, title: 'Dépenses communes', text: 'Répartition, remboursements et engagements partagés.' },
            { icon: TargetIcon, title: 'Projets collectifs', text: 'Budgets, objectifs et patrimoine du foyer réunis.' }
        ]
    }
];

/** Parcours (01–04) puis domaines détaillés (05–14) : une seule structure de section pour toute la page. */
const sections: FeatureSection[] = [
    ...journeys.map((journey) => ({
        id: `journey-${journey.number}`,
        number: journey.number,
        kicker: journey.kicker,
        icon: journey.icon,
        title: journey.title,
        text: journey.text,
        image: journey.image,
        imageAlt: journey.imageAlt,
        floats: journey.floats as FeatureSection['floats'],
        cards: journey.features
    })),
    ...spendupAdditionalDomains.map((domain, index) => ({
        id: `domaine-${domain.id}`,
        number: String(journeys.length + index + 1).padStart(2, '0'),
        kicker: domain.kicker,
        icon: domain.icon,
        title: domain.title,
        text: domain.lead,
        image: domain.image,
        imageAlt: domain.imageAlt,
        floats: domain.floats,
        cards: (domain.cards ?? []).map((card) => ({ icon: card.icon, title: card.title, text: card.intro, items: card.items })),
        footer: domain.footer
    }))
];

const securityItems = [
    'Authentification à deux facteurs',
    'Gestion des appareils connectés',
    'Journal des activités sensibles',
    'Visibilité configurable par champ',
    'Export et suppression des données',
    'Hébergement des données en Suisse'
];
</script>

<template>
    <div class="features-page">
        <section class="features-hero">
            <v-container class="max-width-1218">
                <div class="features-hero__copy">
                    <v-chip color="primary" variant="tonal" rounded="pill" class="features-eyebrow">
                        <SparklesIcon size="15" class="me-2" />
                        19 domaines financiers, une seule plateforme
                    </v-chip>
                    <h1 class="textPrimary">Tout ce qu’il faut pour piloter votre vie financière.</h1>
                    <p class="text-medium-emphasis">
                        Du premier budget au patrimoine familial, Spendup relie chaque donnée pour vous donner une vision claire et
                        exploitable.
                    </p>
                    <div class="features-hero__actions">
                        <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth/register">
                            Commencer gratuitement
                            <ArrowRightIcon size="19" class="ms-2" />
                        </v-btn>
                        <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/tarifs">Voir les tarifs</v-btn>
                    </div>
                </div>

                <div class="features-hero__visual">
                    <div class="feature-orbit feature-orbit--one"></div>
                    <div class="feature-orbit feature-orbit--two"></div>
                    <div class="features-core">
                        <LayoutDashboardIcon size="38" stroke-width="1.4" />
                        <strong>Spendup</strong>
                        <span>Votre vision à 360°</span>
                    </div>
                    <div class="orbit-item orbit-item--accounts"><BuildingBankIcon size="23" /><span>Comptes</span></div>
                    <div class="orbit-item orbit-item--budget"><ChartPieIcon size="23" /><span>Budgets</span></div>
                    <div class="orbit-item orbit-item--wealth"><HomeEcoIcon size="23" /><span>Patrimoine</span></div>
                    <div class="orbit-item orbit-item--family"><UsersIcon size="23" /><span>Famille</span></div>
                </div>
            </v-container>
        </section>

        <section class="features-nav">
            <v-container class="max-width-1218">
                <div class="features-nav__items">
                    <a v-for="journey in journeys" :key="journey.number" :href="`#journey-${journey.number}`">
                        <span>{{ journey.number }}</span>
                        {{ journey.kicker }}
                    </a>
                    <a href="#domaine-categorisation">
                        <span>05+</span>
                        Dans le détail
                    </a>
                </div>
            </v-container>
        </section>

        <section class="features-intro">
            <v-container class="max-width-1218">
                <div v-reveal class="features-heading">
                    <span class="features-kicker">Un parcours financier complet</span>
                    <h2 class="textPrimary">Une plateforme qui évolue avec vos besoins</h2>
                    <p class="text-medium-emphasis">
                        Commencez avec l’essentiel, puis activez les outils dont vous avez besoin à mesure que votre situation évolue.
                    </p>
                </div>
            </v-container>
        </section>

        <section
            v-for="(section, index) in sections"
            :id="section.id"
            :key="section.id"
            class="feature-section"
            :class="{ 'feature-section--alt': index % 2 === 1 }"
        >
            <span class="feature-watermark" aria-hidden="true">{{ section.number }}</span>

            <v-container class="max-width-1218">
                <div v-reveal class="feature-layout" :class="{ 'feature-layout--reversed': index % 2 === 1 }">
                    <div class="feature-main">
                        <div class="feature-copy">
                            <div class="feature-copy__meta">
                                <span class="feature-number">{{ section.number }}</span>
                                <span class="features-kicker">{{ section.kicker }}</span>
                            </div>
                            <div class="feature-icon">
                                <component :is="section.icon" size="29" stroke-width="1.55" />
                            </div>
                            <h2 class="textPrimary">{{ section.title }}</h2>
                            <p class="text-medium-emphasis">{{ section.text }}</p>
                        </div>

                        <div class="feature-grid">
                            <article v-for="card in section.cards" :key="card.title" class="feature-card">
                                <div class="feature-card__top">
                                    <div class="feature-card__icon">
                                        <component :is="card.icon" size="22" stroke-width="1.6" />
                                    </div>
                                    <span class="feature-card__check"><CheckIcon size="14" stroke-width="2.5" /></span>
                                </div>
                                <h3 class="textPrimary">{{ card.title }}</h3>
                                <p v-if="card.text" class="text-medium-emphasis">{{ card.text }}</p>
                                <ul v-if="card.items?.length">
                                    <li v-for="item in card.items" :key="item">{{ item }}</li>
                                </ul>
                            </article>
                        </div>

                        <p v-if="section.footer" class="feature-footnote">{{ section.footer }}</p>
                    </div>

                    <aside class="feature-showcase">
                        <div class="feature-showcase__stage">
                            <div class="feature-showcase__aura" aria-hidden="true"></div>
                            <div class="feature-showcase__frame">
                                <img :src="section.image" :alt="section.imageAlt" loading="lazy" />
                            </div>
                            <div
                                v-for="(item, floatIndex) in section.floats"
                                :key="item.label"
                                class="feature-float"
                                :class="[`feature-float--${floatIndex + 1}`, `feature-float--${item.tone}`]"
                            >
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>
                    </aside>
                </div>
            </v-container>
        </section>

        <section class="features-security">
            <v-container class="max-width-1218">
                <div v-reveal class="features-security__panel">
                    <div class="features-security__copy">
                        <span class="features-kicker">La sécurité, sans compromis</span>
                        <h2>Protégé par défaut.<br />Contrôlé par vous.</h2>
                        <p>La sécurité, la confidentialité et la maîtrise des données sont incluses dans toutes les offres Spendup.</p>
                        <v-btn color="primary" size="large" flat class="text-none" to="/politique-confidentialite">
                            Notre engagement sécurité
                            <ArrowRightIcon size="18" class="ms-2" />
                        </v-btn>
                    </div>

                    <div class="features-security__list">
                        <div v-for="item in securityItems" :key="item">
                            <span><CheckIcon size="15" stroke-width="2.5" /></span>
                            {{ item }}
                        </div>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="features-final">
            <v-container class="max-width-1218 text-center">
                <span class="features-kicker">À vous de jouer</span>
                <h2 class="textPrimary">Découvrez une autre façon de gérer vos finances.</h2>
                <p>Commencez gratuitement, sans carte bancaire et sans engagement.</p>
                <div class="features-final__actions">
                    <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth/register">
                        Créer mon espace
                        <ArrowRightIcon size="19" class="ms-2" />
                    </v-btn>
                    <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">
                        Comparer les offres
                    </v-btn>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/features';
</style>
