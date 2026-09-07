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
    ShieldCheckIcon,
    SparklesIcon,
    TagsIcon,
    TargetIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';

const journeys = [
    {
        number: '01',
        icon: WalletIcon,
        kicker: 'Au quotidien',
        title: 'Comprenez chaque mouvement de votre argent',
        text: 'Tous vos comptes, moyens de paiement et transactions réunis dans une expérience claire.',
        accent: 'primary',
        image: '/assets/images/front-pages/features/feature-imports.png',
        imageAlt: 'Import et organisation de documents financiers',
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
        accent: 'secondary',
        image: '/assets/images/front-pages/features/feature-budget.jpg',
        imageAlt: 'Gestion du budget familial et de l’épargne',
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
        accent: 'primary',
        image: '/assets/images/front-pages/features/feature-properties.png',
        imageAlt: 'Suivi des propriétés, véhicules et actifs patrimoniaux',
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
        accent: 'secondary',
        image: '/assets/images/front-pages/features/feature-collaboration.jpg',
        imageAlt: 'Collaboration financière entre proches',
        features: [
            { icon: UsersIcon, title: 'Espaces partagés', text: 'Famille, couple ou colocation, jusqu’à 5 membres.' },
            { icon: LockIcon, title: 'Rôles & permissions', text: 'Contrôlez précisément qui peut voir ou modifier.' },
            { icon: WalletIcon, title: 'Dépenses communes', text: 'Répartition, remboursements et engagements partagés.' },
            { icon: TargetIcon, title: 'Projets collectifs', text: 'Budgets, objectifs et patrimoine du foyer réunis.' }
        ]
    }
];

const capabilities = [
    { icon: LayoutDashboardIcon, title: 'Tableau de bord', text: 'Soldes, flux et indicateurs clés en un coup d’œil.' },
    { icon: RepeatIcon, title: 'Automatisations', text: 'Règles, récurrences et alertes pour gagner du temps.' },
    { icon: FileInvoiceIcon, title: 'Contrats & salaires', text: 'Dates clés, bulletins et historique professionnel.' },
    { icon: CalendarIcon, title: 'Échéances', text: 'Une vision temporelle de toutes vos obligations.' },
    { icon: ChartLineIcon, title: 'Multi-devises', text: 'Comptes, opérations et actifs dans leur devise.' },
    { icon: ShieldCheckIcon, title: 'Export & contrôle', text: 'Vos données restent accessibles et exportables.' }
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
                </div>
            </v-container>
        </section>

        <section class="features-intro">
            <v-container class="max-width-1218">
                <div class="features-heading">
                    <span class="features-kicker">Un parcours financier complet</span>
                    <h2 class="textPrimary">Une plateforme qui évolue avec vos besoins</h2>
                    <p class="text-medium-emphasis">
                        Commencez avec l’essentiel, puis activez les outils dont vous avez besoin à mesure que votre situation évolue.
                    </p>
                </div>
            </v-container>
        </section>

        <section
            v-for="(journey, index) in journeys"
            :id="`journey-${journey.number}`"
            :key="journey.number"
            class="journey-section"
            :class="{ 'journey-section--alternate': index % 2 === 1 }"
        >
            <v-container class="max-width-1218">
                <div class="journey-layout" :class="{ 'journey-layout--reversed': index % 2 === 1 }">
                    <div class="journey-copy">
                        <div class="journey-copy__meta">
                            <span class="journey-number">{{ journey.number }}</span>
                            <span class="features-kicker">{{ journey.kicker }}</span>
                        </div>
                        <div class="journey-icon" :class="`journey-icon--${journey.accent}`">
                            <component :is="journey.icon" size="29" stroke-width="1.55" />
                        </div>
                        <h2 class="textPrimary">{{ journey.title }}</h2>
                        <p class="text-medium-emphasis">{{ journey.text }}</p>
                        <div class="journey-image">
                            <img :src="journey.image" :alt="journey.imageAlt" loading="lazy" />
                        </div>
                    </div>

                    <div class="journey-grid">
                        <article v-for="feature in journey.features" :key="feature.title" class="journey-card">
                            <div class="journey-card__icon">
                                <component :is="feature.icon" size="22" stroke-width="1.6" />
                            </div>
                            <h3 class="textPrimary">{{ feature.title }}</h3>
                            <p class="text-medium-emphasis">{{ feature.text }}</p>
                            <span class="journey-card__check"><CheckIcon size="14" stroke-width="2.5" /></span>
                        </article>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="capabilities-section">
            <v-container class="max-width-1218">
                <div class="features-heading">
                    <span class="features-kicker">Et bien plus encore</span>
                    <h2 class="textPrimary">Les détails qui changent tout</h2>
                    <p class="text-medium-emphasis">
                        Chaque fonctionnalité est pensée pour réduire la friction et améliorer vos décisions.
                    </p>
                </div>

                <div class="capabilities-grid">
                    <article v-for="capability in capabilities" :key="capability.title">
                        <component :is="capability.icon" size="22" stroke-width="1.65" />
                        <div>
                            <h3 class="textPrimary">{{ capability.title }}</h3>
                            <p class="text-medium-emphasis">{{ capability.text }}</p>
                        </div>
                    </article>
                </div>
            </v-container>
        </section>

        <section class="features-security">
            <v-container class="max-width-1218">
                <div class="features-security__panel">
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
