<script setup lang="ts">
import { ListDetailsIcon, BuildingBankIcon, UsersIcon, HomeEcoIcon, ChartPieIcon, TargetIcon, CircleCheckIcon } from 'vue-tabler-icons';

const FEATURES_IMG = '/assets/images/landingpage/features';

const platformFeatures = [
    {
        icon: ListDetailsIcon,
        title: 'Transactions, revenus & dépenses',
        text: 'Enregistrez vos flux, catégorisez vos opérations et analysez vos habitudes pour garder une vision claire de vos entrées et sorties.',
        bullets: ['revenus, dépenses, transferts et remboursements au même endroit', "catégorisation, tags et détection d'anomalies"]
    },
    {
        icon: BuildingBankIcon,
        title: 'Comptes multi-établissements',
        text: 'Banques, épargne, cash, wallets et moyens de paiement : consolidez tous vos soldes dans une vue unique.',
        bullets: ['PayPal et crypto wallet pris en charge', 'devise et statut propres à chaque compte']
    },
    {
        icon: ChartPieIcon,
        title: 'Budgets personnalisés',
        text: 'Définissez des budgets adaptés à vos besoins et suivez leur évolution en temps réel pour garder le contrôle.'
    },
    {
        icon: TargetIcon,
        title: 'Objectifs financiers',
        text: 'Préparez vos projets — voyage, achat important ou épargne de sécurité — et suivez vos progrès pas à pas.'
    },
    {
        icon: HomeEcoIcon,
        title: 'Patrimoine global',
        text: 'Suivez actifs immobiliers, véhicules, investissements et crypto, avec valorisation historique et vision de patrimoine net.'
    },
    {
        icon: UsersIcon,
        title: 'Collaboration familiale',
        text: 'Créez des espaces partagés, attribuez des rôles, répartissez des dépenses et suivez les engagements communs.'
    }
];
</script>

<template>
    <section class="py-12 py-md-16 bg-surface">
        <v-container class="max-width-1218">
            <div class="su-platform-central mb-8 mb-md-10">
                <div class="su-platform-central__image">
                    <img
                        :src="`${FEATURES_IMG}/platform-centralization.png`"
                        alt="Illustration de centralisation : fonctionnalités financières convergent vers un tableau de bord"
                        class="su-platform-central__img"
                        loading="eager"
                    />
                </div>

                <div class="su-platform-central__text text-center">
                    <v-chip color="primary" variant="tonal" rounded="md" class="mb-4 font-weight-semibold text-14"
                        >19 domaines métier</v-chip
                    >
                    <h2 class="display-2 font-weight-bold textPrimary mb-4">Gérez toutes vos finances depuis une seule plateforme</h2>
                    <p class="text-18 text-medium-emphasis lh-lg mb-0 mx-auto su-narrow">
                        Ces piliers couvrent l'essentiel de votre quotidien financier — revenus, dépenses, budgets, patrimoine et
                        collaboration, centralisés au même endroit.
                    </p>
                </div>
            </div>

            <v-row>
                <v-col v-for="(f, i) in platformFeatures" :key="i" cols="12" sm="6" lg="4">
                    <v-card class="su-card h-100 pa-6 rounded-xl border" elevation="0">
                        <div class="su-icon-wrap rounded-lg mb-5">
                            <component :is="f.icon" size="26" class="text-primary" stroke-width="1.5" />
                        </div>
                        <h3 class="text-h6 font-weight-bold textPrimary mb-3">{{ f.title }}</h3>
                        <p class="text-15 text-medium-emphasis lh-md" :class="f.bullets?.length ? 'mb-4' : 'mb-0'">{{ f.text }}</p>
                        <div v-if="f.bullets?.length">
                            <div v-for="(bullet, bi) in f.bullets" :key="bi" class="d-flex align-start ga-2 mb-2">
                                <CircleCheckIcon size="14" class="text-primary flex-shrink-0 mt-1" stroke-width="1.5" />
                                <p class="text-13 text-medium-emphasis lh-md mb-0">{{ bullet }}</p>
                            </div>
                        </div>
                    </v-card>
                </v-col>
            </v-row>

            <div class="text-center mt-10">
                <v-btn variant="outlined" color="primary" class="text-none" to="/fonctionnalites">Toutes les fonctionnalités</v-btn>
            </div>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
</style>
