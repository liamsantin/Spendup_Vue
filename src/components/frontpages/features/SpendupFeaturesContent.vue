<script setup lang="ts">
import {
    LayoutDashboardIcon,
    UsersIcon,
    HomeEcoIcon,
    FileInvoiceIcon,
    FolderIcon,
    TargetIcon,
    BriefcaseIcon,
    UploadIcon,
    UsersGroupIcon,
    CircleCheckIcon,
    CarIcon,
    BuildingIcon,
    ChartPieIcon,
    CurrencyEuroIcon,
    WalletIcon,
    TrendingUpIcon,
    CalculatorIcon,
    RocketIcon
} from 'vue-tabler-icons';

import ctaVisual from '@/assets/images/front-pages/background/design-collection.webp';
import SpendupDomainSection from '@/components/frontpages/features/sections/SpendupDomainSection.vue';
import SpendupDomainSectionCenter from '@/components/frontpages/features/sections/SpendupDomainSectionCenter.vue';
import { spendupAdditionalDomains } from '@/data/front-pages/spendup-additional-domains';

const FEATURES_IMG = '/assets/images/front-pages/features';

const fichiersSection = {
    icon: FolderIcon,
    title: 'Fichiers et importations',
    lead: 'Centralisez factures et justificatifs, puis retrouvez-les depuis vos opérations financières.',
    footer: "Base prête pour OCR, reconnaissance documentaire et détection de doublons à l'import.",
    cards: [
        {
            title: 'Import & prévisualisation',
            icon: UploadIcon,
            items: ['import unitaire ou en masse', 'aperçu intégré des PDF et images']
        },
        {
            title: 'Organisation & liens',
            icon: FolderIcon,
            items: [
                'classement par année, catégorie et dossier',
                'recherche sur toute la bibliothèque',
                'liaison avec transactions, actifs et contrats'
            ]
        }
    ],
    image: `${FEATURES_IMG}/feature-imports.png`,
    imageAlt: 'Import et gestion de fichiers financiers'
};

const employeursSection = {
    icon: BriefcaseIcon,
    title: 'Employeurs, contrats et salaires',
    lead: 'Structurez employeurs, contrats et bulletins de salaire pour piloter rémunération et fiscalité.',
    footer: 'Chaque bulletin est rattaché à son employeur pour alimenter fiscalité et trésorerie.',
    cards: [
        {
            title: 'Employeurs & contrats',
            icon: BriefcaseIcon,
            items: ['plusieurs employeurs et types de contrat', 'dates clés et historique par poste']
        },
        {
            title: 'Bulletins & fiscalité',
            icon: FileInvoiceIcon,
            items: [
                'historique brut, net, primes et retenues',
                'retenues à la source et déclaration salariale',
                'anticipation de trésorerie selon vos dates de paie'
            ]
        }
    ],
    image: `${FEATURES_IMG}/feature-employers.png`,
    imageAlt: 'Employeurs, contrats et bulletins de salaire'
};

const patrimoineSection = {
    icon: HomeEcoIcon,
    title: 'Propriétés & patrimoine',
    lead: 'Suivez véhicules, logements et actifs avec leurs dépenses, documents et historique.',
    cards: [
        {
            title: 'Véhicules',
            icon: CarIcon,
            items: ['kilométrage et dépenses carburant', 'rappels entretien et contrôle technique', 'coût réel et documents liés']
        },
        {
            title: 'Immeubles & actifs',
            icon: BuildingIcon,
            items: ['logements et biens locatifs', 'charges, travaux et rendement locatif']
        }
    ],
    image: `${FEATURES_IMG}/feature-properties.png`,
    imageAlt: 'Propriétés et patrimoine'
};

const budgetSection = {
    icon: ChartPieIcon,
    title: 'Budgets et dettes',
    lead: 'Maîtrisez vos engagements, anticipez la trésorerie et suivez vos remboursements.',
    cards: [
        {
            title: 'Budgets',
            icon: ChartPieIcon,
            sheetClass: 'bg-lightsuccess',
            toneClass: 'text-success',
            items: ['budgets mensuels ou annuels par catégorie', 'alertes de dépassement en temps réel']
        },
        {
            title: 'Dettes',
            icon: CurrencyEuroIcon,
            sheetClass: 'bg-lightwarning',
            toneClass: 'text-warning',
            items: ['capital restant et échéancier', 'taux, mensualités et durée', 'dettes partagées']
        }
    ],
    image: `${FEATURES_IMG}/feature-budget.jpg`,
    imageAlt: 'Budgets et dettes',
    imageClass: 'su-budget-img'
};

const dashboardTiles = [
    { title: 'Trésorerie consolidée (comptes, cash, wallets)', icon: WalletIcon },
    { title: 'Flux financiers en continu (revenus, dépenses, transferts)', icon: TrendingUpIcon },
    { title: 'Budgets, catégories et dérive des postes', icon: ChartPieIcon },
    { title: "Indicateurs patrimoniaux et projection d'épargne", icon: CalculatorIcon }
];

const multiSection = {
    chip: 'Collaboration multi-utilisateurs',
    title: 'Partagez Spend.Up à plusieurs',
    lead: 'Famille, couple ou colocation : organisez vos finances communes sans perdre le contrôle individuel.',
    ctaLabel: 'Commencer maintenant',
    ctaTo: '/auth/register',
    cards: [
        {
            title: 'Vous pouvez',
            icon: UsersGroupIcon,
            items: [
                'inviter des proches dans un espace financier partagé',
                'définir des rôles et permissions par membre',
                'gérer plusieurs foyers (famille, couple, colocation)'
            ]
        },
        {
            title: 'Concrètement',
            icon: UsersIcon,
            items: [
                'suivre des budgets communs et individuels',
                'répartir des dépenses entre participants',
                'piloter dettes et patrimoines partagés'
            ]
        }
    ],
    alert: "Chaque utilisateur reste maître de ses données et choisit ce qu'il souhaite partager ou non.",
    image: `${FEATURES_IMG}/feature-collaboration.jpg`,
    imageAlt: 'À plusieurs sur Spend.Up',
    imageClass: 'su-friends-img',
    bgClass: 'bg-surface' as const
};

const objectifListe = [
    'centraliser tous vos flux financiers et documents',
    'anticiper vos échéances et engagements récurrents',
    'préparer fiscalité, patrimoine et projets long terme',
    'prendre des décisions basées sur des données fiables'
];

const objectifPillars = [
    { label: 'Plus simple', sheetClass: 'bg-lightwarning' },
    { label: 'Plus claire', sheetClass: 'bg-lightsuccess' },
    { label: 'Plus accessible', sheetClass: 'bg-lightsecondary' }
];

/** Index 0 = fichiers, 1 = employeurs, 2 = patrimoine, 3 = budgets, 4+ = domaines métier. */
const domainSectionBg = (index: number): 'bg-lightprimary' | 'bg-surface' => (index % 2 === 0 ? 'bg-lightprimary' : 'bg-surface');

const domainSectionReversed = (index: number): boolean => index % 2 === 1;
</script>

<template>
    <!-- Introduction -->
    <section class="py-12 py-md-16">
        <v-container class="max-width-1218">
            <div class="text-center mb-0">
                <p class="text-18 text-medium-emphasis mx-auto su-narrow lh-lg mb-0">
                    Spend.Up vous accompagne dans la gestion quotidienne de votre argent, mais aussi dans le suivi de votre patrimoine, de
                    vos projets, de vos dettes, de vos abonnements et de vos objectifs financiers. La plateforme centralise vos comptes,
                    transactions, budgets, revenus, dépenses récurrentes, actifs et prévisions pour une vision claire et exploitable de
                    votre situation financière.
                </p>
            </div>
        </v-container>
    </section>

    <!-- Tableau de bord -->
    <section class="py-12 py-md-16 bg-lightprimary">
        <v-container class="max-width-1218">
            <div class="text-center mb-12 mb-md-16">
                <v-chip color="primary" variant="tonal" rounded="md" class="mb-4 font-weight-semibold text-14">
                    Une plateforme complète
                </v-chip>
                <h2 class="display-2 font-weight-bold textPrimary mb-4">Tout ce dont vous avez besoin</h2>
                <p class="text-18 text-medium-emphasis lh-lg mx-auto su-narrow">
                    De la donnée transactionnelle à la stratégie patrimoniale, Spend.Up couvre toute votre chaîne financière.
                </p>
            </div>

            <v-row align="center">
                <v-col cols="12" md="5" class="pe-md-10">
                    <div class="su-icon-wrap su-icon-wrap--lg rounded-xl d-inline-flex mb-5">
                        <LayoutDashboardIcon size="32" class="text-primary" stroke-width="1.5" />
                    </div>
                    <h3 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Tableau de bord</h3>
                    <p class="text-16 text-medium-emphasis lh-lg mb-0">
                        Une lecture instantanée de votre santé financière : flux, soldes, dérives budgétaires, évolution patrimoniale et
                        indicateurs clés.
                    </p>
                </v-col>
                <v-col cols="12" md="7" class="mt-6 mt-md-0">
                    <v-row>
                        <v-col v-for="(t, i) in dashboardTiles" :key="i" cols="12" sm="6">
                            <v-card class="su-card h-100 pa-5 rounded-xl border" elevation="0">
                                <div class="su-icon-wrap rounded-lg mb-4">
                                    <component :is="t.icon" size="24" class="text-primary" stroke-width="1.5" />
                                </div>
                                <p class="text-body-1 font-weight-semibold textPrimary lh-md mb-0">{{ t.title }}</p>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <SpendupDomainSectionCenter
        :chip="multiSection.chip"
        :title="multiSection.title"
        :lead="multiSection.lead"
        :cards="multiSection.cards"
        :bg-class="multiSection.bgClass"
        :image="multiSection.image"
        :image-alt="multiSection.imageAlt"
        :image-class="multiSection.imageClass"
        :alert="multiSection.alert"
        :cta-label="multiSection.ctaLabel"
        :cta-to="multiSection.ctaTo"
    />

    <SpendupDomainSection
        :icon="fichiersSection.icon"
        :title="fichiersSection.title"
        :lead="fichiersSection.lead"
        :footer="fichiersSection.footer"
        :cards="fichiersSection.cards"
        :bg-class="domainSectionBg(0)"
        :image="fichiersSection.image"
        :image-alt="fichiersSection.imageAlt"
        :reversed="domainSectionReversed(0)"
    />

    <SpendupDomainSection
        :icon="employeursSection.icon"
        :title="employeursSection.title"
        :lead="employeursSection.lead"
        :footer="employeursSection.footer"
        :cards="employeursSection.cards"
        :bg-class="domainSectionBg(1)"
        :image="employeursSection.image"
        :image-alt="employeursSection.imageAlt"
        :reversed="domainSectionReversed(1)"
    />

    <SpendupDomainSection
        :icon="patrimoineSection.icon"
        :title="patrimoineSection.title"
        :lead="patrimoineSection.lead"
        :cards="patrimoineSection.cards"
        :bg-class="domainSectionBg(2)"
        :image="patrimoineSection.image"
        :image-alt="patrimoineSection.imageAlt"
        :reversed="domainSectionReversed(2)"
    />

    <SpendupDomainSection
        :icon="budgetSection.icon"
        :title="budgetSection.title"
        :lead="budgetSection.lead"
        :cards="budgetSection.cards"
        :bg-class="domainSectionBg(3)"
        :image="budgetSection.image"
        :image-alt="budgetSection.imageAlt"
        :image-class="budgetSection.imageClass"
        :reversed="domainSectionReversed(3)"
    />

    <SpendupDomainSection
        v-for="(domain, index) in spendupAdditionalDomains"
        :key="domain.id"
        :icon="domain.icon"
        :title="domain.title"
        :lead="domain.lead"
        :footer="domain.footer"
        :items="domain.items"
        :cards="domain.cards"
        :bg-class="domainSectionBg(index + 4)"
        :image="domain.image"
        :image-alt="domain.imageAlt"
        :reversed="domainSectionReversed(index + 4)"
    />

    <!-- Notre objectif -->
    <section class="py-12 py-md-16 bg-surface">
        <v-container class="max-width-1218">
            <div class="text-center mb-10">
                <div class="su-icon-wrap su-icon-wrap--lg rounded-xl d-inline-flex mb-5">
                    <TargetIcon size="32" class="text-primary" stroke-width="1.5" />
                </div>
                <h3 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Notre objectif</h3>
                <p class="text-18 text-medium-emphasis mx-auto su-narrow mb-0">
                    Rendre la gestion financière plus simple, plus claire et plus accessible — pour mieux comprendre vos habitudes,
                    anticiper vos obligations et prendre des décisions patrimoniales éclairées.
                </p>
            </div>
            <v-row class="mb-8">
                <v-col v-for="p in objectifPillars" :key="p.label" cols="12" sm="4" class="mb-3 mb-sm-0">
                    <v-sheet
                        rounded="xl"
                        :class="[p.sheetClass, 'pa-6 text-center h-100 d-flex align-center justify-center']"
                        elevation="0"
                    >
                        <span class="text-h6 font-weight-bold textPrimary">{{ p.label }}</span>
                    </v-sheet>
                </v-col>
            </v-row>
            <v-card class="su-card su-card--wide pa-8 pa-md-10 rounded-xl border" elevation="0">
                <p class="text-h6 font-weight-bold textPrimary mb-6 text-center">Seul ou à plusieurs, Spend.Up vous aide à :</p>
                <v-row class="justify-center">
                    <v-col cols="12" md="10">
                        <div v-for="(text, i) in objectifListe" :key="i" class="d-flex align-start ga-3 mb-3">
                            <div class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center">
                                <CircleCheckIcon size="20" class="text-primary" stroke-width="1.5" />
                            </div>
                            <p class="text-16 text-medium-emphasis lh-lg mb-0">{{ text }}</p>
                        </div>
                    </v-col>
                </v-row>
            </v-card>
        </v-container>
    </section>

    <!-- Tagline -->
    <section class="su-tagline py-16 py-md-20 text-center">
        <v-container class="max-width-1218">
            <p class="su-tagline-line text-h4 text-md-h3 font-weight-bold textPrimary mb-3">Simple. Centralisé. Intelligent.</p>
            <p class="text-18 text-medium-emphasis mx-auto su-narrow mb-0">
                Spend.Up transforme la gestion financière en un pilotage 360° : personnel, familial et patrimonial.
            </p>
        </v-container>
    </section>

    <!-- CTA — image design-collection.webp -->
    <section class="pb-16 pb-md-20">
        <v-container class="max-content">
            <div class="bg-lightprimary rounded-16 overflow-hidden position-relative">
                <v-row>
                    <v-col cols="12" lg="7" class="py-2">
                        <div class="py-lg-16 py-10 ps-lg-12 pe-lg-4">
                            <RocketIcon size="36" class="text-primary mb-4" stroke-width="1.25" />
                            <h2 class="display-2 font-weight-bold textPrimary mb-4">Prêt à reprendre le contrôle de vos finances ?</h2>
                            <p class="text-18 text-medium-emphasis lh-lg mb-8">
                                Rejoignez Spend.Up en quelques clics. Créez votre compte gratuitement, configurez vos comptes, salaires et
                                budgets, et gardez la main sur vos finances dès aujourd'hui.
                            </p>
                            <div class="d-sm-flex d-block ga-3 align-center">
                                <v-btn color="primary" class="h-48 px-8 text-none" size="large" flat to="/auth/register">
                                    Créer un compte
                                </v-btn>
                                <v-btn
                                    variant="outlined"
                                    color="primary"
                                    class="h-48 px-8 text-none mt-3 mt-sm-0"
                                    size="large"
                                    flat
                                    to="/auth/login"
                                >
                                    J'ai déjà un compte
                                </v-btn>
                            </div>
                        </div>
                    </v-col>
                </v-row>
                <img
                    :src="ctaVisual"
                    alt=""
                    class="position-absolute top-0 end-0 d-lg-block d-none rtlImg su-cta-img"
                    width="900"
                    height="365"
                />
            </div>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
</style>
