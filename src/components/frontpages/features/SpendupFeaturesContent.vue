<script setup lang="ts">
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    CalendarIcon,
    ChartLineIcon,
    ChartPieIcon,
    CheckIcon,
    FileImportIcon,
    FileInvoiceIcon,
    HomeEcoIcon,
    KeyOffIcon,
    LayoutDashboardIcon,
    LockIcon,
    PaperclipIcon,
    RepeatIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TagsIcon,
    TargetIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import type { Component } from 'vue';
import AccountsScene from '@/components/frontpages/mockups/scenes/AccountsScene.vue';
import BudgetScene from '@/components/frontpages/mockups/scenes/BudgetScene.vue';
import FeaturesHeroScene from '@/components/frontpages/mockups/scenes/FeaturesHeroScene.vue';
import SharedScene from '@/components/frontpages/mockups/scenes/SharedScene.vue';
import WealthScene from '@/components/frontpages/mockups/scenes/WealthScene.vue';
import {
    spendupAdditionalDomains,
    spendupDomainGroups,
    spendupDomainNames,
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
    scene: Component;
    features: JourneyFeature[];
}

const journeys: Journey[] = [
    {
        number: '01',
        icon: WalletIcon,
        kicker: 'Au quotidien',
        title: 'Comprenez chaque mouvement de votre argent.',
        text: 'Exportez vos relevés depuis votre e-banking et importez-les en CSV ou en Excel : Spend.Up reconnaît les colonnes, vous laisse relire chaque ligne, puis classe et relie tout. Banques, cartes, TWINT et espèces se retrouvent dans une seule vue.',
        scene: AccountsScene,
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
        scene: BudgetScene,
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
        scene: WealthScene,
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
        scene: SharedScene,
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
    /** Largeur de la tuile sur 12 colonnes. */
    span: 6 | 12;
}

/**
 * Rythme de la grille : deux tuiles par ligne (au moins la moitié de la largeur, pour que
 * les maquettes restent lisibles), et une tuile pleine largeur disposée à l'horizontale
 * quand le groupe est impair.
 */
const SPAN_PATTERNS: Record<number, DomainTile['span'][]> = {
    1: [12],
    2: [6, 6],
    3: [6, 6, 12],
    4: [6, 6, 6, 6]
};

const groups = spendupDomainGroups.map((group: SpendupDomainGroup) => {
    const domains = spendupAdditionalDomains.filter((domain) => domain.group === group.id);
    const pattern = SPAN_PATTERNS[domains.length] ?? domains.map(() => 12 as const);
    return {
        ...group,
        tiles: domains.map<DomainTile>((domain, index) => ({
            domain,
            number: String(journeys.length + spendupAdditionalDomains.indexOf(domain) + 1).padStart(2, '0'),
            points: [...(domain.cards ?? []).flatMap((card) => card.items), ...(domain.items ?? [])].slice(0, 5),
            span: pattern[index] ?? 12
        }))
    };
});

const navItems = [
    ...journeys.map((journey) => ({ href: `#journey-${journey.number}`, number: journey.number, label: journey.kicker })),
    ...groups.map((group) => ({ href: `#groupe-${group.id}`, number: group.number, label: group.kicker }))
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
            <div class="features-hero__grid" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div class="features-hero__layout">
                    <div class="features-hero__copy">
                        <v-chip color="primary" variant="tonal" rounded="pill" class="features-eyebrow su-hero-in">
                            <SparklesIcon size="15" class="me-2" />
                            Votre carnet de bord financier, en {{ spendupDomainNames.length }} domaines métiers
                        </v-chip>
                        <h1 class="textPrimary su-hero-in" style="--su-in-delay: 80ms">
                            Tout ce qu’il faut pour piloter <span>votre vie financière.</span>
                        </h1>
                        <p class="text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                            Importez vos relevés, joignez vos justificatifs : du premier budget au patrimoine familial, Spend.Up relie
                            chaque donnée pour vous donner une vision claire, en francs suisses. Sans jamais se connecter à votre banque.
                        </p>
                        <div class="features-hero__actions su-hero-in" style="--su-in-delay: 240ms">
                            <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="19" class="ms-2" />
                            </v-btn>
                            <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/tarifs"
                                >Voir les tarifs</v-btn
                            >
                        </div>
                        <ul class="features-hero__proof su-hero-in" style="--su-in-delay: 320ms">
                            <li><KeyOffIcon size="15" stroke-width="2.2" /> Sans connexion bancaire</li>
                            <li><CheckIcon size="15" stroke-width="2.4" /> Données hébergées en Suisse</li>
                            <li><CheckIcon size="15" stroke-width="2.4" /> Web &amp; Windows</li>
                        </ul>
                    </div>

                    <div class="features-hero__visual su-hero-visual-in">
                        <FeaturesHeroScene />
                    </div>
                </div>
            </v-container>

            <div class="features-marquee" aria-label="Domaines couverts par Spend.Up">
                <div class="features-marquee__track">
                    <ul v-for="copy in 2" :key="copy" :aria-hidden="copy === 2 ? 'true' : undefined">
                        <li v-for="name in spendupDomainNames" :key="name">{{ name }}</li>
                    </ul>
                </div>
            </div>
        </section>

        <nav class="features-nav" aria-label="Sections de la page">
            <v-container class="max-width-1218">
                <div class="features-nav__items">
                    <a v-for="item in navItems" :key="item.href" :href="item.href">
                        <span>{{ item.number }}</span>
                        {{ item.label }}
                    </a>
                </div>
            </v-container>
        </nav>

        <section
            v-for="(journey, index) in journeys"
            :id="`journey-${journey.number}`"
            :key="journey.number"
            class="journey"
            :class="{ 'journey--alt': index % 2 === 1 }"
        >
            <v-container class="max-width-1218">
                <div v-reveal class="journey__layout" :class="{ 'journey__layout--reversed': index % 2 === 1 }">
                    <div class="journey__copy">
                        <div class="journey__meta">
                            <span class="journey__number">{{ journey.number }}</span>
                            <span class="features-kicker">{{ journey.kicker }}</span>
                        </div>
                        <h2 class="textPrimary">{{ journey.title }}</h2>
                        <p class="journey__lead text-medium-emphasis">{{ journey.text }}</p>

                        <ul class="journey__features">
                            <li v-for="feature in journey.features" :key="feature.title">
                                <span class="journey__feature-icon">
                                    <component :is="feature.icon" size="19" stroke-width="1.7" />
                                </span>
                                <div>
                                    <strong class="textPrimary">{{ feature.title }}</strong>
                                    <p>{{ feature.text }}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div class="journey__visual">
                        <component :is="journey.scene" />
                    </div>
                </div>
            </v-container>
        </section>

        <section id="domaines" class="domains">
            <v-container class="max-width-1218">
                <div v-reveal class="features-heading">
                    <span class="features-kicker">Dans le détail</span>
                    <h2 class="textPrimary">Chaque domaine, pensé jusqu’au bout.</h2>
                    <p class="text-medium-emphasis">
                        Derrière les grands parcours, une dizaine de modules spécialisés qui se parlent entre eux : chaque relevé importé
                        alimente vos budgets, vos prévisions et votre patrimoine.
                    </p>
                </div>

                <div v-for="group in groups" :id="`groupe-${group.id}`" :key="group.id" class="domain-group">
                    <header v-reveal class="domain-group__head">
                        <span class="domain-group__number">{{ group.number }}</span>
                        <div>
                            <span class="features-kicker">{{ group.kicker }}</span>
                            <h3 class="textPrimary">{{ group.title }}</h3>
                        </div>
                        <p class="text-medium-emphasis">{{ group.lead }}</p>
                    </header>

                    <div v-reveal class="domain-grid" data-reveal-stagger="90">
                        <article
                            v-for="tile in group.tiles"
                            :id="`domaine-${tile.domain.id}`"
                            :key="tile.domain.id"
                            class="domain-tile"
                            :class="[`domain-tile--span-${tile.span}`, { 'domain-tile--wide': tile.span === 12 }]"
                        >
                            <div class="domain-tile__visual">
                                <component :is="tile.domain.scene" />
                            </div>
                            <div class="domain-tile__body">
                                <div class="domain-tile__meta">
                                    <span class="domain-tile__icon">
                                        <component :is="tile.domain.icon" size="19" stroke-width="1.7" />
                                    </span>
                                    <span class="domain-tile__kicker">{{ tile.number }} · {{ tile.domain.kicker }}</span>
                                </div>
                                <h4 class="textPrimary">{{ tile.domain.title }}</h4>
                                <p class="text-medium-emphasis">{{ tile.domain.lead }}</p>
                                <ul>
                                    <li v-for="point in tile.points" :key="point">
                                        <CheckIcon size="14" stroke-width="2.4" />
                                        <span>{{ point }}</span>
                                    </li>
                                </ul>
                                <p v-if="tile.domain.footer" class="domain-tile__footnote">{{ tile.domain.footer }}</p>
                            </div>
                        </article>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="features-security">
            <v-container class="max-width-1218">
                <div v-reveal class="features-security__panel">
                    <div class="features-security__glow" aria-hidden="true"></div>
                    <div class="features-security__copy">
                        <span class="features-security__badge"><ShieldCheckIcon size="17" stroke-width="1.8" /> Sécurité incluse</span>
                        <h2>Protégé par défaut.<br />Contrôlé par vous.</h2>
                        <p>
                            Spend.Up n’a aucun accès à vos comptes bancaires. La sécurité, la confidentialité et la maîtrise de vos données
                            sont incluses dans toutes les offres, jamais vendues en option.
                        </p>
                        <div class="features-security__actions">
                            <v-btn color="white" size="large" flat class="text-none" to="/politique-confidentialite">
                                Notre engagement confidentialité
                                <ArrowRightIcon size="18" class="ms-2" />
                            </v-btn>
                            <RouterLink to="/#hebergement" class="features-security__link">Hébergement en Suisse</RouterLink>
                        </div>
                    </div>

                    <ul class="features-security__list">
                        <li v-for="item in securityItems" :key="item">
                            <span><CheckIcon size="15" stroke-width="2.5" /></span>
                            {{ item }}
                        </li>
                    </ul>
                </div>
            </v-container>
        </section>

        <section class="features-final">
            <v-container class="max-width-1218">
                <div v-reveal class="features-final__card">
                    <div class="features-final__ring features-final__ring--one" aria-hidden="true"></div>
                    <div class="features-final__ring features-final__ring--two" aria-hidden="true"></div>
                    <span class="features-kicker">À vous de jouer</span>
                    <h2 class="textPrimary">Découvrez une autre façon <span>de gérer vos finances.</span></h2>
                    <p class="text-medium-emphasis">Commencez gratuitement, sans carte bancaire et sans engagement.</p>
                    <div class="features-final__actions">
                        <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth?tab=register">
                            Créer mon espace
                            <ArrowRightIcon size="19" class="ms-2" />
                        </v-btn>
                        <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">
                            Comparer les offres
                        </v-btn>
                    </div>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/features';
</style>
