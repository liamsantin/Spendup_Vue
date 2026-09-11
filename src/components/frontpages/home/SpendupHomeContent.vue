<script setup lang="ts">
import {
    ArrowRightIcon,
    BrandWindowsIcon,
    BuildingBankIcon,
    ChartPieIcon,
    HomeEcoIcon,
    UsersIcon,
    CheckIcon,
    DeviceDesktopIcon,
    DownloadIcon,
    LockIcon,
    PlugConnectedIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TargetIcon,
    UserPlusIcon
} from 'vue-tabler-icons';
import heroVisual from '@/assets/images/front-pages/dashboard-preview.png';

const PLATFORM_IMG = '/assets/images/front-pages/features/home-platform-central.png';

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

const assurances = [
    'Authentification à deux facteurs (2FA)',
    'Gestion et révocation des appareils',
    'Export et suppression de vos données',
    'Contrôle précis des accès partagés'
];

const pillars = [
    {
        icon: BuildingBankIcon,
        label: 'Comptes & transactions',
        text: 'Banques, cash, cartes et wallets consolidés, avec catégorisation automatique.'
    },
    {
        icon: ChartPieIcon,
        label: 'Budgets & objectifs',
        text: 'Des limites claires, des projets suivis pas à pas et des alertes avant le dépassement.'
    },
    {
        icon: HomeEcoIcon,
        label: 'Patrimoine & placements',
        text: 'Immobilier, véhicules, investissements et crypto réunis dans un patrimoine net vivant.'
    },
    {
        icon: UsersIcon,
        label: 'Famille & partage',
        text: 'Un espace commun, des rôles précis et des dépenses réparties sans mélanger vos comptes.'
    }
];

const steps = [
    {
        icon: UserPlusIcon,
        title: 'Créez votre espace',
        text: 'Une adresse e-mail suffit. Aucune carte bancaire, aucun engagement : votre espace est prêt en moins d’une minute.',
        meta: 'Moins d’une minute'
    },
    {
        icon: PlugConnectedIcon,
        title: 'Ajoutez vos comptes',
        text: 'Banques, cash, cartes, wallets : renseignez vos comptes ou importez vos relevés. Spendup classe et relie tout.',
        meta: 'Import PDF & saisie rapide'
    },
    {
        icon: ChartPieIcon,
        title: 'Pilotez, décidez',
        text: 'Budgets, objectifs, patrimoine et alertes : une vision à 360° qui transforme vos chiffres en décisions.',
        meta: 'Vision 360°'
    }
];

const faqs = [
    {
        question: 'Puis-je commencer gratuitement ?',
        answer: 'Oui. L’offre Gratuit ne nécessite aucune carte bancaire pour commencer.'
    },
    {
        question: 'Mes données sont-elles sécurisées ?',
        answer: 'Oui. Spendup intègre notamment la 2FA, la gestion des appareils et des mécanismes de protection des accès.'
    },
    {
        question: 'Puis-je utiliser Spendup en famille ?',
        answer: 'Oui. L’offre Famille (5) permet à un payeur de créer un foyer jusqu’à 5 personnes (propriétaire inclus). Les membres héritent du plan du propriétaire et n’ont pas besoin d’un abonnement payant.'
    },
    {
        question: 'Que deviennent mes données après résiliation ?',
        answer: 'Elles restent consultables et exportables. Seules les fonctionnalités Premium passent en lecture seule.'
    }
];
</script>

<template>
    <div class="home-page">
        <section class="home-hero">
            <v-container class="max-width-1218">
                <v-row align="center">
                    <v-col cols="12" lg="6" class="home-hero__copy">
                        <v-chip color="primary" variant="tonal" rounded="pill" class="home-eyebrow su-hero-in">
                            <SparklesIcon size="15" class="me-2" />
                            La gestion financière, enfin plus simple
                        </v-chip>

                        <h1 class="home-title textPrimary su-hero-in" style="--su-in-delay: 80ms">
                            Toute votre vie financière,
                            <span>réunie au même endroit.</span>
                        </h1>

                        <p class="home-subtitle text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                            Spendup transforme vos données financières en une vision claire, utile et actionnable — du budget quotidien à
                            votre patrimoine.
                        </p>

                        <div class="home-hero__actions su-hero-in" style="--su-in-delay: 240ms">
                            <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="19" class="ms-2" />
                            </v-btn>
                            <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/fonctionnalites">
                                Découvrir Spendup
                            </v-btn>
                        </div>

                        <div class="home-hero__reassurance su-hero-in" style="--su-in-delay: 320ms">
                            <span><CheckIcon size="16" /> Sans carte bancaire</span>
                            <span><CheckIcon size="16" /> Sans engagement</span>
                            <span><CheckIcon size="16" /> Données en Suisse</span>
                        </div>
                    </v-col>

                    <v-col cols="12" lg="6" class="mt-12 mt-lg-0">
                        <div class="hero-product su-hero-visual-in">
                            <div class="hero-product__glow"></div>
                            <div class="hero-product__window">
                                <div class="hero-product__bar">
                                    <span></span><span></span><span></span>
                                    <div class="hero-product__label">Tableau de bord Spendup</div>
                                </div>
                                <img
                                    :src="heroVisual"
                                    alt="Aperçu du tableau de bord Spendup"
                                    class="hero-product__image"
                                    width="1024"
                                    height="505"
                                />
                            </div>
                            <div class="hero-float hero-float--security su-float-soft">
                                <ShieldCheckIcon size="21" />
                                <div><strong>100 % Suisse</strong><small>Vos données sont protégées</small></div>
                            </div>
                            <div class="hero-float hero-float--overview su-float-soft" style="--su-float-delay: 1.4s">
                                <ChartPieIcon size="21" />
                                <div><strong>Vision à 360°</strong><small>Budget &amp; patrimoine</small></div>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-container>
        </section>

        <section class="trust-strip">
            <v-container class="max-width-1218">
                <div v-reveal class="trust-strip__grid" data-reveal-stagger="70">
                    <div><strong>19</strong><span>domaines financiers réunis</span></div>
                    <div><strong>100 %</strong><span>des données en Suisse</span></div>
                    <div><strong>2FA</strong><span>incluse pour chaque compte</span></div>
                    <div><strong>360°</strong><span>sur votre vie financière</span></div>
                </div>
            </v-container>
        </section>

        <section id="comment-ca-marche" class="home-steps">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Comment ça marche</span>
                    <h2 class="textPrimary">Trois étapes pour y voir clair</h2>
                    <p class="text-medium-emphasis">
                        Pas de paramétrage interminable. Spendup vous accompagne dès la première minute, puis grandit avec vous.
                    </p>
                </div>

                <ol v-reveal class="steps-grid" data-reveal-stagger="120">
                    <li v-for="(step, index) in steps" :key="step.title" class="step-card">
                        <div class="step-card__head">
                            <span class="step-card__index">0{{ index + 1 }}</span>
                            <div class="step-card__icon">
                                <component :is="step.icon" size="23" stroke-width="1.6" />
                            </div>
                        </div>
                        <h3 class="textPrimary">{{ step.title }}</h3>
                        <p class="text-medium-emphasis">{{ step.text }}</p>
                        <span class="step-card__meta">{{ step.meta }}</span>
                    </li>
                </ol>
            </v-container>
        </section>

        <section id="plateforme" class="home-platform">
            <div class="home-platform__backdrop" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div v-reveal class="platform-layout">
                    <div class="platform-visual">
                        <div class="platform-visual__glow" aria-hidden="true"></div>
                        <img
                            :src="PLATFORM_IMG"
                            alt="Toutes les dimensions de vos finances convergent vers un tableau de bord unique"
                            loading="lazy"
                            width="1536"
                            height="1024"
                        />
                    </div>

                    <div class="platform-copy">
                        <span class="section-kicker">Une seule plateforme</span>
                        <h2 class="textPrimary">19 domaines financiers.<br />Une seule vision, la vôtre.</h2>
                        <p class="platform-copy__lead text-medium-emphasis">
                            Fini les fichiers dispersés et les applications qui ne se parlent pas. Du compte courant au patrimoine familial,
                            chaque donnée est reliée aux autres pour vous donner une lecture claire, complète et toujours à jour de votre
                            situation.
                        </p>

                        <ul class="platform-pillars">
                            <li v-for="pillar in pillars" :key="pillar.label">
                                <span class="platform-pillars__icon">
                                    <component :is="pillar.icon" size="21" stroke-width="1.65" />
                                </span>
                                <div>
                                    <strong>{{ pillar.label }}</strong>
                                    <p>{{ pillar.text }}</p>
                                </div>
                            </li>
                        </ul>

                        <div class="platform-copy__actions">
                            <v-btn color="primary" size="large" flat class="text-none px-6" to="/fonctionnalites">
                                Découvrir toutes les fonctionnalités
                                <ArrowRightIcon size="18" class="ms-2" />
                            </v-btn>
                            <span>Gratuit pour commencer · Sans carte bancaire</span>
                        </div>
                    </div>
                </div>
            </v-container>
        </section>

        <section id="securite" class="home-security">
            <v-container class="max-width-1218">
                <div v-reveal class="security-panel">
                    <div class="security-panel__visual">
                        <div class="security-orbit security-orbit--outer"></div>
                        <div class="security-orbit security-orbit--inner"></div>
                        <div class="security-shield">
                            <LockIcon size="42" stroke-width="1.4" />
                        </div>
                        <div class="swiss-mark" aria-label="Données hébergées en Suisse">
                            <svg viewBox="0 0 32 32" aria-hidden="true">
                                <rect width="32" height="32" rx="7" fill="#DA291C" />
                                <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                                <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                            </svg>
                            <span>Données hébergées en Suisse</span>
                        </div>
                    </div>

                    <div class="security-panel__content">
                        <span class="section-kicker">Sécurité &amp; souveraineté</span>
                        <h2 class="textPrimary">Vos finances sont personnelles.<br />Elles le restent.</h2>
                        <p class="text-medium-emphasis">
                            La sécurité n’est pas une option Premium. Elle est intégrée dès le premier jour, pour chaque utilisateur.
                        </p>
                        <ul>
                            <li v-for="item in assurances" :key="item">
                                <span><CheckIcon size="15" stroke-width="2.5" /></span>{{ item }}
                            </li>
                        </ul>
                        <v-btn variant="text" color="primary" class="text-none px-0" to="/politique-confidentialite">
                            Découvrir notre politique de confidentialité
                            <ArrowRightIcon size="17" class="ms-2" />
                        </v-btn>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="home-anywhere">
            <v-container class="max-width-1218">
                <div v-reveal class="anywhere-panel">
                    <div class="anywhere-panel__copy">
                        <div class="feature-card__icon">
                            <DeviceDesktopIcon size="25" stroke-width="1.65" />
                        </div>
                        <span class="section-kicker">Disponible partout</span>
                        <h2 class="textPrimary">Votre espace financier vous suit, pas l’inverse.</h2>
                        <p class="text-medium-emphasis">
                            Consultez Spendup depuis votre navigateur ou installez l’application Windows pour garder vos finances à portée
                            de main.
                        </p>
                        <div class="anywhere-panel__actions">
                            <v-btn color="primary" size="large" flat class="text-none" :href="windowsDownloadUrl" download>
                                <BrandWindowsIcon size="19" class="me-2" />
                                Télécharger pour Windows
                            </v-btn>
                            <span><DownloadIcon size="15" /> Windows 10/11 · 64 bits</span>
                        </div>
                    </div>

                    <div class="anywhere-panel__devices">
                        <div class="device-card device-card--main">
                            <BuildingBankIcon size="23" />
                            <span>Solde disponible</span>
                            <strong>CHF 12’840.50</strong>
                            <div class="device-card__chart">
                                <i v-for="height in [45, 68, 54, 82, 64, 92, 75]" :key="height" :style="{ height: `${height}%` }"></i>
                            </div>
                        </div>
                        <div class="device-card device-card--side">
                            <TargetIcon size="20" />
                            <span>Objectif vacances</span>
                            <strong>72 %</strong>
                            <div class="device-card__progress"><i></i></div>
                        </div>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="home-faq">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Questions fréquentes</span>
                    <h2 class="textPrimary">Tout ce qu’il faut savoir avant de commencer</h2>
                </div>
                <v-expansion-panels v-reveal class="faq-list" elevation="0">
                    <v-expansion-panel v-for="faq in faqs" :key="faq.question" class="faq-item" elevation="0">
                        <v-expansion-panel-title>{{ faq.question }}</v-expansion-panel-title>
                        <v-expansion-panel-text>{{ faq.answer }}</v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-container>
        </section>

        <section id="commencer" class="home-final-cta">
            <div class="home-final-cta__ring home-final-cta__ring--one" aria-hidden="true"></div>
            <div class="home-final-cta__ring home-final-cta__ring--two" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div v-reveal class="final-cta">
                    <span class="section-kicker">Votre prochaine bonne décision financière</span>
                    <h2 class="textPrimary">Commencez simplement.<br /><span>Évoluez à votre rythme.</span></h2>
                    <p class="text-medium-emphasis">Créez votre espace gratuitement, sans carte bancaire et sans engagement.</p>
                    <div class="home-final-cta__actions">
                        <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth?tab=register">
                            Commencer gratuitement
                            <ArrowRightIcon size="19" class="ms-2" />
                        </v-btn>
                        <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">Voir les tarifs</v-btn>
                    </div>
                    <div class="final-cta__reassurance">
                        <span><CheckIcon size="16" /> Sans carte bancaire</span>
                        <span><CheckIcon size="16" /> Sans engagement</span>
                        <span><CheckIcon size="16" /> Données en Suisse</span>
                    </div>
                    <p class="final-cta__beta">
                        <SparklesIcon size="15" />
                        Spendup est en version bêta : les données peuvent être réinitialisées sans préavis pendant cette phase.
                    </p>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/home-content';
</style>
