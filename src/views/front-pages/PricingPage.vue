<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import ContactBar from '@/components/frontpages/shared/ContactBar.vue';
import TextBannerCard from '@/components/frontpages/shared/TextBannerCard.vue';
import Packages from '@/components/frontpages/pricing/Packages.vue';
import { SpendupPricingPackages } from '@/data/front-pages/front-pages-data';

const comparisonRows = [
    { feature: 'Gestion des revenus', free: true, premium: true },
    { feature: 'Gestion des dépenses', free: true, premium: true },
    { feature: 'Catégories personnalisées', free: true, premium: true },
    { feature: 'Tableau de bord', free: true, premium: true },
    { feature: 'Statistiques de base', free: true, premium: true },
    { feature: 'Budgets', free: true, premium: true },
    { feature: 'Objectifs financiers', free: 'Limité', premium: 'Illimité' },
    { feature: 'Rapports avancés', free: false, premium: true },
    { feature: 'Assistance prioritaire', free: false, premium: true }
];

const transparencyPoints = [
    'Aucun frais caché',
    'Aucun engagement à long terme',
    'Aucune surprise lors de la facturation',
    'Annulation possible à tout moment selon les conditions applicables'
];

const whyChoose = [
    'Comprendre ses finances',
    'Suivre ses dépenses',
    'Atteindre ses objectifs',
    'Prendre de meilleures décisions financières'
];

const faqs = [
    {
        question: 'Puis-je utiliser Spend.Up gratuitement ?',
        answer: 'Oui. Une version gratuite est disponible afin de permettre à chacun de gérer ses finances sans coût initial.'
    },
    {
        question: "Vais-je perdre mes données si je change d'offre ?",
        answer: 'Non. Vos données restent associées à votre compte.'
    },
    {
        question: 'Les prix peuvent-ils évoluer ?',
        answer: "Oui. Les éventuelles évolutions tarifaires seront toujours communiquées à l'avance."
    },
    {
        question: 'Puis-je résilier à tout moment ?',
        answer: "Oui. Vous restez libre d'interrompre votre abonnement selon les conditions applicables."
    }
];

function formatCell(value: boolean | string): string {
    if (value === true) return '✓';
    if (value === false) return '✗';
    return value;
}
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <TextBannerCard caption="tarifs" title="Choisissez votre plan" />

        <div class="pt-96">
            <v-container class="max-width-1218">
                <h2 class="text-h2 text-center pt-10 textPrimary">
                    Des offres simples et transparentes,<br />
                    adaptées à vos besoins financiers !
                </h2>

                <p class="text-18 text-medium-emphasis lh-lg text-center mt-6 mb-0 pricing-intro">
                    Chez Spend.Up, nous croyons que chacun devrait pouvoir bénéficier d'outils modernes pour mieux gérer ses finances. Notre
                    objectif est de proposer une plateforme simple, transparente et adaptée à différents besoins.
                </p>

                <Packages :items="SpendupPricingPackages" currency="CHF" :show-header="false" :columns-lg="6" :columns-md="6" />

                <section class="mb-12 mb-md-16">
                    <h2 class="text-h2 text-center textPrimary mb-8">Comparatif des fonctionnalités</h2>
                    <v-card elevation="10" class="rounded-md overflow-hidden">
                        <v-table class="pricing-table">
                            <thead>
                                <tr>
                                    <th class="text-left textPrimary font-weight-bold">Fonctionnalité</th>
                                    <th class="text-center textPrimary font-weight-bold">Gratuit</th>
                                    <th class="text-center textPrimary font-weight-bold">Premium</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in comparisonRows" :key="row.feature">
                                    <td class="text-medium-emphasis">{{ row.feature }}</td>
                                    <td class="text-center font-weight-medium">{{ formatCell(row.free) }}</td>
                                    <td class="text-center font-weight-medium">{{ formatCell(row.premium) }}</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card>
                </section>

                <section class="mb-12 mb-md-16">
                    <h2 class="text-h2 textPrimary mb-4">Une tarification transparente</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Nous nous engageons à maintenir une politique tarifaire simple et claire.
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li v-for="point in transparencyPoints" :key="point" class="mb-2">{{ point }}</li>
                    </ul>
                </section>

                <section class="mb-12 mb-md-16">
                    <h2 class="text-h2 textPrimary mb-4">Pourquoi choisir Spend.Up ?</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Contrairement aux solutions complexes ou surchargées de fonctionnalités inutiles, Spend.Up se concentre sur
                        l'essentiel :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li v-for="point in whyChoose" :key="point" class="mb-2">{{ point }}</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Notre mission est de rendre la gestion financière simple, accessible et sécurisée.
                    </p>
                </section>

                <section class="mb-4">
                    <h2 class="text-h2 text-center textPrimary mb-8">Questions fréquentes</h2>
                    <v-expansion-panels elevation="0" class="pricing-faq">
                        <v-expansion-panel v-for="faq in faqs" :key="faq.question" elevation="0" rounded="lg" class="border mb-3">
                            <v-expansion-panel-title class="text-subtitle-1 font-weight-semibold textPrimary">
                                {{ faq.question }}
                            </v-expansion-panel-title>
                            <v-expansion-panel-text class="text-body-1 text-medium-emphasis lh-lg">
                                {{ faq.answer }}
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </section>

                <v-card class="pricing-cta rounded-md pa-8 pa-md-10 text-center mt-12 mt-md-16" elevation="10">
                    <h2 class="text-h2 textPrimary mb-4">Prêt à reprendre le contrôle de vos finances ?</h2>
                    <p class="text-18 text-medium-emphasis lh-lg mb-6">
                        Rejoignez les utilisateurs qui font confiance à Spend.Up pour suivre leurs dépenses, maîtriser leur budget et
                        construire un avenir financier plus serein.
                    </p>
                    <p class="text-body-1 font-weight-bold textPrimary mb-6">
                        Créez votre compte dès aujourd'hui et commencez gratuitement.
                    </p>
                    <v-btn color="primary" size="large" class="text-none px-8" flat to="/auth/register">Créer un compte</v-btn>
                </v-card>
            </v-container>
        </div>

        <ContactBar />
        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/pricing';
</style>
