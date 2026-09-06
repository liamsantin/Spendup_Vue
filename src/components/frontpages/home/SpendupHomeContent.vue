<script setup lang="ts">
import { computed } from 'vue';
import SpendupExpansionPanels from '@/components/frontpages/home/sections/SpendupExpansionPanels.vue';
import SpendupPlatformCentralSection from '@/components/frontpages/home/sections/SpendupPlatformCentralSection.vue';
import SpendupAccessibleSection from '@/components/frontpages/home/sections/SpendupAccessibleSection.vue';
import SpendupWindowsDownloadSection from '@/components/frontpages/home/sections/SpendupWindowsDownloadSection.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import {
    LayoutDashboardIcon,
    ShieldLockIcon,
    UserIcon,
    UsersIcon,
    SchoolIcon,
    BriefcaseIcon,
    CircleCheckIcon,
    RocketIcon
} from 'vue-tabler-icons';

import heroVisual from '@/assets/images/front-pages/background/Scene.png';

const securityPoints = [
    'Authentification sécurisée',

    'Authentification à deux facteurs (2FA)',

    'Gestion des sessions actives',

    'Vérification des adresses e-mail',

    'Protection contre les accès non autorisés',

    'Surveillance des activités de connexion'
];

const audiences = [
    {
        icon: UserIcon,

        title: 'Particuliers',

        text: 'Suivez facilement vos revenus, dépenses et objectifs afin de mieux gérer votre budget personnel.'
    },

    {
        icon: UsersIcon,

        title: 'Couples et familles',

        text: 'Obtenez une meilleure visibilité sur les finances du foyer et planifiez vos projets communs.'
    },

    {
        icon: SchoolIcon,

        title: 'Étudiants',

        text: "Apprenez à gérer votre budget et développez de bonnes habitudes financières dès aujourd'hui."
    },

    {
        icon: BriefcaseIcon,

        title: 'Indépendants',

        text: 'Gardez un œil sur vos dépenses et revenus professionnels grâce à un suivi simple et efficace.'
    }
];

type FaqItem = {
    question: string;

    answer?: string;

    answerKey?: 'security' | 'categories' | 'delete-account';
};

const faqs: FaqItem[] = [
    {
        question: 'Mes données sont-elles sécurisées ?',

        answerKey: 'security'
    },

    {
        question: 'Puis-je accéder à mes données depuis plusieurs appareils ?',

        answer: 'Oui. Votre compte est accessible depuis tous vos appareils connectés à Internet.'
    },

    {
        question: 'Puis-je définir mes propres catégories et budgets ?',

        answerKey: 'categories'
    },

    {
        question: 'Puis-je supprimer mon compte ?',

        answerKey: 'delete-account'
    }
];

const stats = [
    { kicker: 'Fondée', value: '2026', caption: 'Spend.Up voit le jour' },
    { kicker: 'Données', value: '100 %', caption: 'Hébergées en Suisse' },
    {
        kicker: 'Domaines métier',
        value: '19',
        caption: 'De la transaction au patrimoine, en passant par fiscalité, immobilier, dettes et projections.'
    },
    { kicker: 'Vision', value: '360°', caption: 'Pilotage financier personnel, familial et collaboratif.' }
];

const faqAccordionItems = computed(() => faqs.map((_, index) => ({ key: index })));
</script>

<template>
    <!-- Hero -->

    <section class="su-hero pt-md-8 pt-4 pb-md-14 pb-10 overflow-hidden bg-lightprimary">
        <v-container class="max-width-1218">
            <v-row align="center">
                <v-col cols="12" lg="6" class="pe-lg-8">
                    <p class="text-uppercase text-primary text-13 font-weight-semibold letter-spacing-1 mb-3">
                        Plateforme de gestion financière 100% Suisse
                    </p>

                    <h1 class="su-hero-title textPrimary font-weight-bold mb-6">
                        Reprenez le contrôle de vos finances avec

                        <span class="su-brand">Spend.Up</span>
                    </h1>

                    <p class="text-18 text-medium-emphasis lh-lg mb-4">
                        Spend.Up centralise vos revenus, dépenses, budgets et objectifs dans un espace sécurisé. Suivez votre situation au
                        quotidien et prenez de meilleures décisions financières.
                    </p>

                    <p class="text-16 font-weight-semibold textPrimary mb-0">
                        Gérez plus simplement. Analysez vos habitudes. Atteignez vos objectifs.
                    </p>

                    <div class="d-flex flex-wrap ga-3 mt-8">
                        <v-btn color="primary" size="large" class="px-6 text-none" flat to="/auth/register">Commencer gratuitement</v-btn>

                        <v-btn size="large" variant="outlined" color="primary" class="px-6 text-none" to="/auth/login">Se connecter</v-btn>
                    </div>
                </v-col>

                <v-col cols="12" lg="6" class="text-center mt-8 mt-lg-0">
                    <div class="su-hero-visual pa-4 rounded-xl">
                        <img :src="heroVisual" alt="" class="su-hero-img w-100" width="640" height="480" />

                        <div class="su-hero-caption mt-4 text-14 text-medium-emphasis">
                            <LayoutDashboardIcon size="20" class="text-primary d-inline vertical-middle me-1" stroke-width="1.5" />

                            Tableau de bord Spend.Up
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <SpendupWindowsDownloadSection />

    <!-- Bêta -->

    <section class="py-10">
        <v-container class="max-width-1218">
            <AppAlert type="warning">
                <div class="text-h6 font-weight-bold textPrimary mb-1">Important — Version bêta</div>
                <p class="text-body-1 text-medium-emphasis mb-0 lh-lg">
                    Spend.Up est actuellement en version bêta. Les données peuvent être réinitialisées ou perdues sans préavis. Nous vous
                    recommandons de ne pas y stocker d'informations sensibles ou définitives.
                </p>
            </AppAlert>
        </v-container>
    </section>

    <SpendupPlatformCentralSection />

    <SpendupAccessibleSection />

    <!-- Pour qui -->

    <section class="py-12 py-md-16 bg-lightprimary">
        <v-container class="max-width-1218">
            <div class="text-center mb-12">
                <h2 class="display-2 font-weight-bold textPrimary mb-4">Pour qui est Spend.Up ?</h2>
            </div>

            <v-row>
                <v-col v-for="(item, i) in audiences" :key="i" cols="12" sm="6" lg="3">
                    <v-card class="su-card h-100 pa-6 rounded-xl border text-center" elevation="0">
                        <div class="su-icon-wrap rounded-lg mb-5 mx-auto">
                            <component :is="item.icon" size="26" class="text-primary" stroke-width="1.5" />
                        </div>

                        <h3 class="text-h6 font-weight-bold textPrimary mb-3">{{ item.title }}</h3>

                        <p class="text-15 text-medium-emphasis lh-md mb-0">{{ item.text }}</p>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <!-- Sécurité -->
    <section class="py-12 py-md-16">
        <v-container class="max-width-1218">
            <v-row align="center">
                <v-col cols="12" md="5" class="mb-8 mb-md-0">
                    <div class="su-icon-wrap su-icon-wrap--lg rounded-xl d-inline-flex mb-5">
                        <ShieldLockIcon size="32" class="text-primary" stroke-width="1.5" />
                    </div>

                    <h2 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Une sécurité conçue dès le départ</h2>

                    <p class="text-16 text-medium-emphasis lh-lg mb-4">
                        Vos données financières méritent le plus haut niveau de protection. Spend.Up intègre plusieurs mécanismes de
                        sécurité afin de protéger votre compte et vos informations.
                    </p>

                    <p class="text-16 text-medium-emphasis lh-lg mb-6">
                        La confidentialité et la sécurité des données sont au cœur de la conception de la plateforme.
                    </p>

                    <v-btn variant="outlined" color="primary" class="text-none" to="/politique-confidentialite">
                        Politique de confidentialité
                    </v-btn>
                </v-col>

                <v-col cols="12" md="7">
                    <v-card class="su-card pa-6 rounded-xl border" elevation="0">
                        <div v-for="(point, i) in securityPoints" :key="i" class="d-flex align-start ga-3 mb-3">
                            <div class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center">
                                <CircleCheckIcon size="18" class="text-primary" stroke-width="1.5" />
                            </div>

                            <p class="text-15 text-medium-emphasis lh-lg mb-0">{{ point }}</p>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <!-- Chiffres -->
    <section class="py-12 py-md-16 bg-lightprimary">
        <v-container class="max-width-1218">
            <div class="text-center mb-12">
                <h2 class="display-2 font-weight-bold textPrimary mb-4">Spend.Up en quelques chiffres</h2>
                <p class="text-18 text-medium-emphasis mx-auto su-narrow">
                    Une fondation robuste pour piloter transactions, patrimoine, fiscalité, projections et collaboration.
                </p>
            </div>
            <v-row>
                <v-col v-for="(s, i) in stats" :key="i" cols="6" lg="3">
                    <v-card class="su-stat text-center pa-6 pa-md-8 rounded-xl h-100" elevation="2">
                        <span class="text-uppercase text-primary text-12 font-weight-semibold d-block mb-2">{{ s.kicker }}</span>
                        <div class="su-stat-value textPrimary font-weight-bold mb-2">{{ s.value }}</div>
                        <p class="text-14 text-medium-emphasis mb-0 lh-md">{{ s.caption }}</p>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <!-- Suisse -->
    <section class="space-p-96">
        <v-container class="max-width-1218">
            <v-row align="center" class="flex-column-reverse flex-lg-row">
                <v-col cols="12" lg="6">
                    <div class="d-inline-flex align-center ga-2 mb-4">
                        <div class="su-ch-flag rounded-lg overflow-hidden flex-shrink-0" aria-hidden="true" title="Suisse">
                            <svg class="su-swiss-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                <rect width="32" height="32" fill="#DA291C" />
                                <rect x="13" y="4" width="6" height="24" fill="#FFFFFF" />
                                <rect x="4" y="13" width="24" height="6" fill="#FFFFFF" />
                            </svg>
                        </div>
                        <span class="text-uppercase text-primary text-13 font-weight-semibold">Hébergement</span>
                    </div>
                    <h2 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-6">Vos données sont stockées en Suisse</h2>
                    <p class="text-16 text-medium-emphasis lh-lg mb-4">
                        Nous hébergeons vos informations financières sur des serveurs situés en Suisse. Cela garantit un niveau élevé de
                        protection des données et une conformité avec les exigences locales en matière de confidentialité et de sécurité.
                    </p>
                    <p class="text-16 text-medium-emphasis lh-lg mb-6">
                        Vous gardez la maîtrise de vos données ; nous ne les vendons pas et ne les utilisons que pour faire fonctionner le
                        service et vous offrir la meilleure expérience possible.
                    </p>
                    <v-btn variant="outlined" color="primary" class="text-none" to="/politique-confidentialite">
                        Politique de confidentialité
                    </v-btn>
                </v-col>
                <v-col cols="12" lg="6" class="mb-10 mb-lg-0 ps-lg-12">
                    <v-card class="rounded-xl overflow-hidden elevation-4 su-swiss-card" elevation="0">
                        <div class="su-swiss-gradient pa-10 pa-md-14 text-center">
                            <ShieldLockIcon size="48" class="text-white mb-4 opacity-90" stroke-width="1.25" />
                            <p class="text-h6 text-white font-weight-medium mb-0">Confidentialité &amp; souveraineté des données</p>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </section>

    <!-- FAQ -->

    <section class="py-12 py-md-16 bg-surface">
        <v-container class="max-width-1218">
            <div class="text-center mb-10">
                <h2 class="display-2 font-weight-bold textPrimary mb-4">Questions fréquentes</h2>
            </div>

            <div class="mx-auto su-faq-card">
                <SpendupExpansionPanels
                    :items="faqAccordionItems"
                    title-class="text-18 font-weight-normal py-4"
                    text-class="text-subtitle-1 text-medium-emphasis"
                >
                    <template #title="{ index }">
                        {{ faqs[index].question }}
                    </template>
                    <template #text="{ index }">
                        <template v-if="faqs[index].answerKey === 'security'">
                            <p class="text-15 text-medium-emphasis lh-lg mb-4">
                                Oui. Spend.Up utilise plusieurs mécanismes de sécurité afin de protéger vos informations et votre compte.
                            </p>
                            <v-btn variant="outlined" color="primary" size="small" class="text-none" to="/politique-confidentialite">
                                Politique de confidentialité
                            </v-btn>
                        </template>
                        <template v-else-if="faqs[index].answerKey === 'categories'">
                            <p class="text-15 text-medium-emphasis lh-lg mb-4">
                                Oui. Spend.Up vous permet de personnaliser l'organisation de vos finances selon vos besoins.
                            </p>
                            <v-btn variant="outlined" color="primary" size="small" class="text-none" to="/fonctionnalites">
                                Voir les fonctionnalités
                            </v-btn>
                        </template>
                        <template v-else-if="faqs[index].answerKey === 'delete-account'">
                            <p class="text-15 text-medium-emphasis lh-lg mb-4">
                                Oui. Vous pouvez demander la suppression de votre compte conformément à notre politique de confidentialité.
                            </p>
                            <v-btn variant="outlined" color="primary" size="small" class="text-none" to="/politique-confidentialite">
                                Politique de confidentialité
                            </v-btn>
                        </template>
                        <p v-else class="text-15 text-medium-emphasis lh-lg mb-0">{{ faqs[index].answer }}</p>
                    </template>
                </SpendupExpansionPanels>
            </div>
        </v-container>
    </section>

    <!-- CTA final -->

    <section class="pb-16 pb-md-20">
        <v-container class="max-width-1218">
            <v-card class="su-card pa-8 pa-md-12 rounded-xl border text-center" elevation="0">
                <RocketIcon size="36" class="text-primary mb-4" stroke-width="1.25" />

                <h2 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Commencez dès aujourd'hui</h2>

                <p class="text-18 text-medium-emphasis mx-auto su-narrow lh-lg mb-4">
                    Reprenez le contrôle de votre situation financière grâce à une plateforme simple, sécurisée et conçue pour vous
                    accompagner dans la gestion quotidienne de votre argent.
                </p>

                <p class="text-16 font-weight-semibold textPrimary mb-8">
                    Créez votre compte gratuitement et découvrez tout le potentiel de Spend.Up.
                </p>

                <div class="d-flex flex-wrap justify-center ga-3">
                    <v-btn color="primary" size="large" class="px-8 text-none" flat to="/auth/register">Commencer gratuitement</v-btn>

                    <v-btn size="large" variant="outlined" color="primary" class="px-8 text-none" to="/fonctionnalites">
                        Découvrir les fonctionnalités
                    </v-btn>
                </div>
            </v-card>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
@use '@/scss/frontpages/home/home-content';
</style>
