<script setup lang="ts">
import {
    ArrowRightIcon,
    BrandWindowsIcon,
    BuildingBankIcon,
    CalendarStatsIcon,
    ChartPieIcon,
    CheckIcon,
    DeviceDesktopIcon,
    DownloadIcon,
    HomeEcoIcon,
    LockIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TargetIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import heroVisual from '@/assets/images/front-pages/background/Scene.png';

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

const features = [
    {
        icon: WalletIcon,
        title: 'Vos finances au quotidien',
        text: 'Centralisez comptes, moyens de paiement et transactions dans une vue claire et toujours à jour.'
    },
    {
        icon: ChartPieIcon,
        title: 'Un budget qui vous ressemble',
        text: 'Créez vos catégories, définissez vos budgets et comprenez où va réellement votre argent.'
    },
    {
        icon: TargetIcon,
        title: 'Des objectifs concrets',
        text: 'Planifiez vos projets et suivez votre progression, de l’épargne de sécurité au prochain grand achat.'
    },
    {
        icon: HomeEcoIcon,
        title: 'Votre patrimoine à 360°',
        text: 'Regroupez placements, immobilier, prêts et passifs pour connaître votre situation nette.'
    },
    {
        icon: CalendarStatsIcon,
        title: 'Anticipez sereinement',
        text: 'Visualisez échéances, récurrences et prévisions pour prendre vos décisions avec plus de confiance.'
    },
    {
        icon: UsersIcon,
        title: 'À plusieurs, simplement',
        text: 'Partagez comptes, budgets et objectifs tout en gardant vos espaces personnels séparés.'
    }
];

const assurances = [
    'Authentification à deux facteurs (2FA)',
    'Gestion et révocation des appareils',
    'Export et suppression de vos données',
    'Contrôle précis des accès partagés'
];

const faqs = [
    {
        question: 'Puis-je commencer gratuitement ?',
        answer: 'Oui. Solo Essentiel est gratuit et ne nécessite aucune carte bancaire pour commencer.'
    },
    {
        question: 'Mes données sont-elles sécurisées ?',
        answer: 'Oui. Spendup intègre notamment la 2FA, la gestion des appareils et des mécanismes de protection des accès.'
    },
    {
        question: 'Puis-je utiliser Spendup en famille ?',
        answer: 'Oui. L’offre Famille permet de réunir jusqu’à 5 membres avec des rôles, permissions et visibilités configurables.'
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
                        <v-chip color="primary" variant="tonal" rounded="pill" class="home-eyebrow">
                            <SparklesIcon size="15" class="me-2" />
                            La gestion financière, enfin plus simple
                        </v-chip>

                        <h1 class="home-title textPrimary">
                            Toute votre vie financière,
                            <span>réunie au même endroit.</span>
                        </h1>

                        <p class="home-subtitle text-medium-emphasis">
                            Spendup transforme vos données financières en une vision claire, utile et actionnable — du budget quotidien à
                            votre patrimoine.
                        </p>

                        <div class="home-hero__actions">
                            <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth/register">
                                Commencer gratuitement
                                <ArrowRightIcon size="19" class="ms-2" />
                            </v-btn>
                            <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/fonctionnalites">
                                Découvrir Spendup
                            </v-btn>
                        </div>

                        <div class="home-hero__reassurance">
                            <span><CheckIcon size="16" /> Sans carte bancaire</span>
                            <span><CheckIcon size="16" /> Sans engagement</span>
                            <span><CheckIcon size="16" /> Données en Suisse</span>
                        </div>
                    </v-col>

                    <v-col cols="12" lg="6" class="mt-12 mt-lg-0">
                        <div class="hero-product">
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
                                    width="640"
                                    height="480"
                                />
                            </div>
                            <div class="hero-float hero-float--security">
                                <ShieldCheckIcon size="21" />
                                <div><strong>100 % Suisse</strong><small>Vos données sont protégées</small></div>
                            </div>
                            <div class="hero-float hero-float--overview">
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
                <div class="trust-strip__grid">
                    <div><strong>19</strong><span>domaines financiers réunis</span></div>
                    <div><strong>100 %</strong><span>des données en Suisse</span></div>
                    <div><strong>2FA</strong><span>incluse pour chaque compte</span></div>
                    <div><strong>360°</strong><span>sur votre vie financière</span></div>
                </div>
            </v-container>
        </section>

        <section class="home-features">
            <v-container class="max-width-1218">
                <div class="section-heading">
                    <span class="section-kicker">Une plateforme, toutes vos finances</span>
                    <h2 class="textPrimary">Passez de la dispersion à une vision claire</h2>
                    <p class="text-medium-emphasis">
                        Les bons outils pour gérer aujourd’hui, anticiper demain et construire votre patrimoine.
                    </p>
                </div>

                <div class="feature-grid">
                    <article v-for="feature in features" :key="feature.title" class="feature-card">
                        <div class="feature-card__icon">
                            <component :is="feature.icon" size="25" stroke-width="1.65" />
                        </div>
                        <h3 class="textPrimary">{{ feature.title }}</h3>
                        <p class="text-medium-emphasis">{{ feature.text }}</p>
                    </article>
                </div>

                <div class="home-features__action">
                    <v-btn color="primary" variant="outlined" size="large" class="text-none px-6" to="/fonctionnalites">
                        Explorer toutes les fonctionnalités
                        <ArrowRightIcon size="18" class="ms-2" />
                    </v-btn>
                </div>
            </v-container>
        </section>

        <section class="home-security">
            <v-container class="max-width-1218">
                <div class="security-panel">
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
                <div class="anywhere-panel">
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

        <section class="home-beta">
            <v-container class="max-width-1218">
                <div class="beta-note">
                    <SparklesIcon size="22" />
                    <div>
                        <strong>Spendup est actuellement en version bêta</strong>
                        <p>
                            Les données peuvent être réinitialisées sans préavis. Évitez d’y stocker des informations sensibles ou
                            définitives pendant cette phase.
                        </p>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="home-faq">
            <v-container class="max-width-1218">
                <div class="section-heading">
                    <span class="section-kicker">Questions fréquentes</span>
                    <h2 class="textPrimary">Tout ce qu’il faut savoir avant de commencer</h2>
                </div>
                <v-expansion-panels class="faq-list" elevation="0">
                    <v-expansion-panel v-for="faq in faqs" :key="faq.question" class="faq-item" elevation="0">
                        <v-expansion-panel-title>{{ faq.question }}</v-expansion-panel-title>
                        <v-expansion-panel-text>{{ faq.answer }}</v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-container>
        </section>

        <section class="home-final-cta">
            <v-container class="max-width-1218 text-center">
                <span class="section-kicker">Votre prochaine bonne décision financière</span>
                <h2 class="textPrimary">Commencez simplement. Évoluez à votre rythme.</h2>
                <p>Créez votre espace gratuitement, sans carte bancaire et sans engagement.</p>
                <div class="home-final-cta__actions">
                    <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth/register">
                        Commencer gratuitement
                        <ArrowRightIcon size="19" class="ms-2" />
                    </v-btn>
                    <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">Voir les tarifs</v-btn>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/home-content';
</style>
