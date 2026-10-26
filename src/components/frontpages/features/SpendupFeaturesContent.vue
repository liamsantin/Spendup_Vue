<script setup lang="ts">
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    CalendarIcon,
    ChartLineIcon,
    ChartPieIcon,
    FileImportIcon,
    FileInvoiceIcon,
    HomeEcoIcon,
    LayoutDashboardIcon,
    LockIcon,
    PaperclipIcon,
    RepeatIcon,
    TagsIcon,
    TargetIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import type { Component } from 'vue';
import {
    appScreenshot,
    spendupAdditionalDomains,
    spendupDomainGroups,
    type AppScreenshot,
    type SpendupAdditionalDomain,
    type SpendupDomainGroup
} from '@/data/front-pages/spendup-additional-domains';

interface JourneyFeature {
    icon: Component;
    title: string;
    text: string;
}

interface Journey {
    number: string;
    icon: Component;
    kicker: string;
    title: string;
    text: string;
    /** Captures réelles de l'écran correspondant (aucune si l'écran n'existe pas encore). */
    images: AppScreenshot[];
    features: JourneyFeature[];
}

const journeys: Journey[] = [
    {
        number: '01',
        icon: WalletIcon,
        kicker: 'Au quotidien',
        title: 'Comprenez chaque mouvement de votre argent.',
        text: 'Exportez vos relevés depuis votre e-banking et importez-les en CSV ou en Excel : Spend.Up reconnaît les colonnes, vous laisse relire chaque ligne, puis classe et relie tout. Banques, cartes, TWINT et espèces se retrouvent dans une seule vue.',
        images: [appScreenshot('transactions.jpg', 'Liste des transactions Spend.Up avec compte, catégorie, contrepartie et montant')],
        features: [
            {
                icon: FileImportIcon,
                title: 'Imports de relevés',
                text: 'CSV et Excel, modèle mémorisé par banque, revue ligne par ligne avant validation.'
            },
            {
                icon: TagsIcon,
                title: 'Reconnaissance qui apprend',
                text: 'Tiers et moyens de paiement retrouvés grâce aux alias appris de vos corrections.'
            },
            { icon: PaperclipIcon, title: 'Justificatifs PDF', text: 'Factures, reçus et contrats joints à vos opérations.' },
            {
                icon: AlertTriangleIcon,
                title: 'Doublons détectés',
                text: 'Une ligne déjà importée est signalée avant d’être comptée deux fois.'
            }
        ]
    },
    {
        number: '02',
        icon: ChartPieIcon,
        kicker: 'Planifier',
        title: 'Donnez une direction à votre budget.',
        text: 'Passez du simple suivi à une vraie capacité d’anticipation : des limites claires, des projets chiffrés et un reste à vivre recalculé à chaque import.',
        images: [
            appScreenshot('budgets.jpg', 'Budgets Spend.Up : alimentation et budget mensuel avec progression'),
            appScreenshot('goals.jpg', 'Objectifs d’épargne Spend.Up : vacances et fonds d’urgence')
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
        title: 'Pilotez votre patrimoine dans son ensemble.',
        text: 'Immobilier, placements, 3e pilier et véhicules : une lecture consolidée de ce que vous possédez, devez et préparez pour demain.',
        images: [],
        features: [
            { icon: ChartLineIcon, title: 'Placements & crypto', text: 'Portefeuilles, positions, opérations et valorisations.' },
            { icon: HomeEcoIcon, title: 'Immobilier & actifs', text: 'Biens, hypothèques, baux, véhicules, charges et rendement.' },
            { icon: FileInvoiceIcon, title: 'Fiscalité & revenus', text: 'Employeurs, salaires, retenues et préparation fiscale.' },
            { icon: LayoutDashboardIcon, title: 'Scénarios & projections', text: 'Trésorerie, patrimoine net et santé financière.' }
        ]
    },
    {
        number: '04',
        icon: UsersIcon,
        kicker: 'Partager',
        title: 'Gérez ensemble, sans tout mélanger.',
        text: 'Couple, famille ou colocation : partagez budgets et dépenses communes en gardant chacun le contrôle de son espace personnel.',
        images: [],
        features: [
            { icon: UsersIcon, title: 'Espaces partagés', text: 'Famille, couple ou colocation, jusqu’à 5 membres.' },
            { icon: LockIcon, title: 'Rôles & permissions', text: 'Contrôlez précisément qui peut voir ou modifier.' },
            { icon: WalletIcon, title: 'Dépenses communes', text: 'Répartition, remboursements et engagements partagés.' },
            { icon: TargetIcon, title: 'Projets collectifs', text: 'Budgets, objectifs et patrimoine du foyer réunis.' }
        ]
    }
];

interface DomainTile {
    domain: SpendupAdditionalDomain;
    number: string;
    points: string[];
}

const groups = spendupDomainGroups.map((group: SpendupDomainGroup) => ({
    ...group,
    tiles: spendupAdditionalDomains
        .filter((domain) => domain.group === group.id)
        .map<DomainTile>((domain, index) => ({
            domain,
            // Numérotation hiérarchique : groupe 05 → 5.1, 5.2…
            number: `${Number(group.number)}.${index + 1}`,
            points: [...(domain.cards ?? []).flatMap((card) => card.items), ...(domain.items ?? [])].slice(0, 5)
        }))
}));

const navItems = [
    ...journeys.map((journey) => ({ href: `#journey-${journey.number}`, number: journey.number, label: journey.kicker })),
    ...groups.map((group) => ({ href: `#groupe-${group.id}`, number: group.number, label: group.kicker }))
];

/** Trois compositions distinctes : texte + capture, captures en paire, puis les deux derniers parcours côte à côte. */
const [dailyJourney, planJourney, ...laterJourneys] = journeys;

/** Planche du hero : un aperçu de l’étendue du produit, en vraies captures. */
const heroShots = [
    appScreenshot('budgets.jpg', 'Budgets'),
    appScreenshot('categories.jpg', 'Catégories'),
    appScreenshot('recurring.jpg', 'Récurrences'),
    appScreenshot('calendar.jpg', 'Calendrier')
];

const securityItems = [
    'Aucun identifiant bancaire demandé',
    'Authentification à deux facteurs et appareils',
    'Journal des activités sensibles',
    'Visibilité configurable par champ',
    'Export et suppression des données',
    'Hébergement en Suisse, chez Infomaniak'
];
</script>

<template>
    <div class="features-page">
        <section class="features-hero">
            <div class="s-container">
                <div class="s-grid features-hero__grid">
                    <div class="features-hero__copy">
                        <h1 class="s-display su-hero-in">
                            Tout ce qu’il faut pour piloter <span class="s-primary">votre vie financière.</span>
                        </h1>
                        <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                            Importez vos relevés, joignez vos justificatifs : du premier budget au patrimoine familial, Spend.Up relie
                            chaque donnée pour vous donner une vision claire, en francs suisses. Sans jamais se connecter à votre banque.
                        </p>
                        <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                            <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <v-btn size="x-large" variant="outlined" class="text-none" to="/tarifs">Voir les tarifs</v-btn>
                        </div>
                        <p class="features-hero__note su-hero-in" style="--su-in-delay: 240ms">
                            Sans connexion bancaire · Données hébergées en Suisse · Web &amp; Windows
                        </p>
                    </div>

                    <ul class="features-hero__sheet su-hero-visual-in" style="--su-in-delay: 160ms" aria-label="Aperçu de l’application">
                        <li v-for="shot in heroShots" :key="shot.src">
                            <img :src="shot.src" :alt="`Écran ${shot.alt} de Spend.Up`" width="2160" height="1350" />
                            <span>{{ shot.alt }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <nav class="features-nav" aria-label="Sections de la page">
            <div class="s-container">
                <div class="features-nav__items">
                    <a v-for="item in navItems" :key="item.href" :href="item.href">
                        <span>{{ item.number }}</span>
                        {{ item.label }}
                    </a>
                </div>
            </div>
        </nav>

        <!-- Parcours 01 : texte à gauche, capture à fond perdu à droite -->
        <section :id="`journey-${dailyJourney.number}`" class="s-section journey">
            <div class="s-container">
                <div v-reveal class="s-grid journey-split">
                    <div class="journey-split__copy">
                        <span class="s-kicker"
                            ><b>{{ dailyJourney.number }}</b> {{ dailyJourney.kicker }}</span
                        >
                        <h2 class="s-h2">{{ dailyJourney.title }}</h2>
                        <p class="journey__lead">{{ dailyJourney.text }}</p>
                        <ul class="journey__list">
                            <li v-for="feature in dailyJourney.features" :key="feature.title">
                                <strong>{{ feature.title }}</strong>
                                <span>{{ feature.text }}</span>
                            </li>
                        </ul>
                    </div>
                    <figure v-for="image in dailyJourney.images" :key="image.src" class="s-figure journey-split__figure">
                        <img :src="image.src" :alt="image.alt" width="2160" height="1350" loading="lazy" />
                        <figcaption>{{ image.alt }}</figcaption>
                    </figure>
                </div>
            </div>
        </section>

        <!-- Parcours 02 : en-tête, captures en paire, points clés en colonnes -->
        <section :id="`journey-${planJourney.number}`" class="s-section journey">
            <div class="s-container">
                <header v-reveal class="s-grid s-head">
                    <div class="s-head__label">
                        <b>{{ planJourney.number }}</b> {{ planJourney.kicker }}
                    </div>
                    <div class="s-head__body">
                        <h2>{{ planJourney.title }}</h2>
                        <p>{{ planJourney.text }}</p>
                    </div>
                </header>

                <div v-reveal class="s-grid journey-pair">
                    <figure v-for="image in planJourney.images" :key="image.src" class="s-figure">
                        <img :src="image.src" :alt="image.alt" width="2160" height="1350" loading="lazy" />
                        <figcaption>{{ image.alt }}</figcaption>
                    </figure>
                </div>

                <ul v-reveal class="s-grid journey__columns" data-reveal-stagger="80">
                    <li v-for="(feature, index) in planJourney.features" :key="feature.title">
                        <span class="s-label">{{ Number(planJourney.number) }}.{{ index + 1 }}</span>
                        <h3>{{ feature.title }}</h3>
                        <p>{{ feature.text }}</p>
                    </li>
                </ul>
            </div>
        </section>

        <!-- Parcours 03 et 04 : côte à côte -->
        <section class="s-section journey-duo">
            <div class="s-container">
                <div class="s-grid">
                    <article
                        v-for="journey in laterJourneys"
                        :id="`journey-${journey.number}`"
                        :key="journey.number"
                        v-reveal
                        class="journey-duo__item"
                    >
                        <span class="s-kicker"
                            ><b>{{ journey.number }}</b> {{ journey.kicker }}</span
                        >
                        <h2 class="s-h2">{{ journey.title }}</h2>
                        <p class="journey__lead">{{ journey.text }}</p>
                        <ul class="journey__list">
                            <li v-for="feature in journey.features" :key="feature.title">
                                <strong>{{ feature.title }}</strong>
                                <span>{{ feature.text }}</span>
                            </li>
                        </ul>
                    </article>
                </div>
            </div>
        </section>

        <section id="domaines" class="s-section domains">
            <div class="s-container">
                <header v-reveal class="s-grid s-head">
                    <div class="s-head__label"><b>05–07</b> Dans le détail</div>
                    <div class="s-head__body">
                        <h2>Chaque domaine, <span class="s-primary">pensé jusqu’au bout.</span></h2>
                        <p>
                            Derrière les grands parcours, une dizaine de modules spécialisés qui se parlent entre eux : chaque relevé
                            importé alimente vos budgets, vos prévisions et votre patrimoine.
                        </p>
                    </div>
                </header>

                <div v-for="group in groups" :id="`groupe-${group.id}`" :key="group.id" class="domain-group">
                    <header v-reveal class="s-grid domain-group__head">
                        <span class="domain-group__number">{{ group.number }}</span>
                        <div class="domain-group__titles">
                            <span class="s-label">{{ group.kicker }}</span>
                            <h3>{{ group.title }}</h3>
                            <p>{{ group.lead }}</p>
                        </div>
                    </header>

                    <article
                        v-for="(tile, tileIndex) in group.tiles"
                        :id="`domaine-${tile.domain.id}`"
                        :key="tile.domain.id"
                        v-reveal
                        class="s-grid domain"
                        :class="{ 'domain--text': !tile.domain.image, 'domain--flip': tile.domain.image && tileIndex % 2 === 1 }"
                    >
                        <div class="domain__body">
                            <span class="s-label">{{ tile.number }} · {{ tile.domain.kicker }}</span>
                            <h4>{{ tile.domain.title }}</h4>
                            <p>{{ tile.domain.lead }}</p>
                            <ul class="s-rules">
                                <li v-for="point in tile.points" :key="point">{{ point }}</li>
                            </ul>
                            <p v-if="tile.domain.footer" class="domain__footnote">{{ tile.domain.footer }}</p>
                        </div>
                        <figure v-if="tile.domain.image" class="s-figure domain__figure">
                            <img :src="tile.domain.image.src" :alt="tile.domain.image.alt" width="2160" height="1350" loading="lazy" />
                        </figure>
                    </article>
                </div>
            </div>
        </section>

        <section class="s-section features-security">
            <div class="s-container">
                <div v-reveal class="s-grid features-security__grid">
                    <div class="features-security__label"><b>■</b> Sécurité incluse</div>
                    <div class="features-security__copy">
                        <h2>Protégé par défaut. <span>Contrôlé par vous.</span></h2>
                        <p>
                            Spend.Up n’a aucun accès à vos comptes bancaires. La sécurité, la confidentialité et la maîtrise de vos données
                            sont incluses dans toutes les offres, jamais vendues en option.
                        </p>
                        <div class="s-actions">
                            <v-btn color="white" size="large" flat class="text-none" to="/politique-confidentialite">
                                Notre engagement confidentialité
                                <ArrowRightIcon size="17" class="ms-2" />
                            </v-btn>
                            <RouterLink to="/#hebergement" class="features-security__link">Hébergement en Suisse</RouterLink>
                        </div>
                    </div>
                    <ul class="features-security__list">
                        <li v-for="item in securityItems" :key="item">{{ item }}</li>
                    </ul>
                </div>
            </div>
        </section>

        <section class="features-final">
            <div class="s-container">
                <div v-reveal class="s-grid features-final__grid">
                    <h2 class="features-final__title s-display">Découvrez une autre façon <span>de gérer vos finances.</span></h2>
                    <div class="features-final__side">
                        <p>Commencez gratuitement, sans carte bancaire et sans engagement.</p>
                        <div class="s-actions">
                            <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Créer mon espace
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink to="/tarifs" class="features-final__link">Comparer les offres</RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/features';
</style>
