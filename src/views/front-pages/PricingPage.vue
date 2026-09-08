<script setup lang="ts">
import { ref } from 'vue';
import { ArrowRightIcon, CheckIcon, DatabaseExportIcon, LockIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';

type BillingPeriod = 'monthly' | 'yearly';

interface PricingPlan {
    name: string;
    description: string;
    price: number;
    lead?: string;
    features: string[];
    cta: string;
    popular?: boolean;
}

const billingPeriod = ref<BillingPeriod>('yearly');

const plans: PricingPlan[] = [
    {
        name: 'Solo Essentiel',
        description: 'Pour découvrir Spendup et gérer ses finances quotidiennes.',
        price: 0,
        features: [
            'Jusqu’à 2 comptes',
            'Jusqu’à 3 moyens de paiement',
            'Transactions manuelles',
            'Catégories et tiers personnels',
            'Consultation des soldes et historiques',
            'Partage ponctuel avec un ami',
            'Authentification sécurisée, 2FA et gestion des appareils',
            'Notifications essentielles',
            'Export et suppression des données'
        ],
        cta: 'Commencer gratuitement'
    },
    {
        name: 'Solo Gestion',
        description: 'Pour automatiser et organiser son budget.',
        price: 5.9,
        lead: 'Tout Solo Essentiel, plus :',
        features: [
            'Comptes, transactions et catégories illimités',
            'Tags et règles de catégorisation',
            'Imports de relevés bancaires',
            'Dépenses et revenus récurrents',
            'Budgets par catégorie',
            'Objectifs d’épargne',
            'Calendrier et échéances financières',
            'Gestion des contrats et documents',
            'Partage de comptes avancé',
            'Exports enrichis et gestion multidevise'
        ],
        cta: 'Choisir Solo Gestion',
        popular: true
    },
    {
        name: 'Solo Patrimoine',
        description: 'Pour piloter l’ensemble de son patrimoine.',
        price: 11.9,
        lead: 'Tout Solo Gestion, plus :',
        features: [
            'Suivi des actifs et placements',
            'Portefeuilles, positions et opérations d’investissement',
            'Biens immobiliers, lots, baux et charges',
            'Prêts, dettes et passifs',
            'Suivi fiscal et préparation des déclarations',
            'Prévisions de trésorerie',
            'Scénarios financiers',
            'Indicateurs de santé financière',
            'Rapports patrimoniaux consolidés',
            'Automatisations et alertes avancées'
        ],
        cta: 'Choisir Solo Patrimoine'
    },
    {
        name: 'Famille',
        description: 'Pour gérer les finances du foyer ensemble.',
        price: 17.9,
        lead: 'Tout Solo Patrimoine, plus :',
        features: [
            'Jusqu’à 5 membres',
            'Espace financier familial partagé',
            'Comptes et transactions du foyer',
            'Catégories, budgets et objectifs communs',
            'Dépenses partagées et remboursements',
            'Patrimoine et immobilier consolidés',
            'Dettes et engagements communs',
            'Documents et calendrier familial',
            'Rôles et permissions par membre',
            'Visibilité configurable par compte et par champ',
            'Espaces personnels conservés séparément'
        ],
        cta: 'Créer un espace famille'
    }
];

const assurances = [
    {
        icon: ShieldCheckIcon,
        title: 'Sans engagement',
        text: 'Résiliez simplement, à tout moment.'
    },
    {
        icon: LockIcon,
        title: 'Sécurité incluse',
        text: '2FA et gestion des appareils sur toutes les offres.'
    },
    {
        icon: DatabaseExportIcon,
        title: 'Vos données vous appartiennent',
        text: 'Exportez ou supprimez vos données quand vous le souhaitez.'
    }
];

function displayedPrice(plan: PricingPlan): string {
    if (plan.price === 0) return '0';
    const monthlyPrice = billingPeriod.value === 'yearly' ? (plan.price * 10) / 12 : plan.price;
    return monthlyPrice.toFixed(2);
}

function yearlyTotal(plan: PricingPlan): string {
    return (plan.price * 10).toFixed(2);
}
</script>

<template>
    <div class="front-wraper pricing-page">
        <AnnounceBar />
        <Header />

        <main>
            <section class="pricing-hero">
                <v-container class="max-width-1218 pricing-hero__content">
                    <v-chip color="primary" variant="tonal" rounded="pill" class="pricing-eyebrow su-hero-in">
                        Des tarifs simples et transparents
                    </v-chip>
                    <h1 class="pricing-title textPrimary su-hero-in" style="--su-in-delay: 80ms">
                        Le bon plan pour chaque étape de votre vie financière
                    </h1>
                    <p class="pricing-subtitle text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                        Commencez gratuitement, puis évoluez à votre rythme. Toutes les offres sont sans engagement.
                    </p>

                    <div class="billing-switch su-hero-in" style="--su-in-delay: 240ms" role="group" aria-label="Période de facturation">
                        <button
                            type="button"
                            class="billing-switch__option"
                            :class="{ 'billing-switch__option--active': billingPeriod === 'monthly' }"
                            @click="billingPeriod = 'monthly'"
                        >
                            Mensuel
                        </button>
                        <button
                            type="button"
                            class="billing-switch__option"
                            :class="{ 'billing-switch__option--active': billingPeriod === 'yearly' }"
                            @click="billingPeriod = 'yearly'"
                        >
                            Annuel
                            <span class="billing-switch__saving">2 mois offerts</span>
                        </button>
                    </div>
                </v-container>
            </section>

            <section class="pricing-plans">
                <v-container class="max-width-1218">
                    <v-row v-reveal align="stretch" class="pricing-grid" data-reveal-stagger="90">
                        <v-col v-for="plan in plans" :key="plan.name" cols="12" sm="6" lg="3">
                            <article class="plan-card" :class="{ 'plan-card--popular': plan.popular }">
                                <div v-if="plan.popular" class="plan-card__badge">Le plus populaire</div>

                                <div class="plan-card__header">
                                    <h2 class="plan-card__name textPrimary">{{ plan.name }}</h2>
                                    <p class="plan-card__description text-medium-emphasis">{{ plan.description }}</p>
                                </div>

                                <div class="plan-card__price">
                                    <template v-if="plan.price === 0">
                                        <span class="plan-card__amount textPrimary">Gratuit</span>
                                        <span class="plan-card__price-note">pour toujours</span>
                                    </template>
                                    <template v-else>
                                        <div>
                                            <span class="plan-card__currency">CHF</span>
                                            <span class="plan-card__amount textPrimary">{{ displayedPrice(plan) }}</span>
                                            <span class="plan-card__period">/mois</span>
                                        </div>
                                        <span class="plan-card__price-note">
                                            {{
                                                billingPeriod === 'yearly'
                                                    ? `Facturé CHF ${yearlyTotal(plan)} par an`
                                                    : 'Facturé mensuellement'
                                            }}
                                        </span>
                                    </template>
                                </div>

                                <v-btn
                                    :color="plan.popular ? 'primary' : undefined"
                                    :variant="plan.popular ? 'flat' : 'outlined'"
                                    size="large"
                                    block
                                    class="plan-card__cta text-none"
                                    to="/auth/register"
                                >
                                    {{ plan.cta }}
                                    <ArrowRightIcon size="18" class="ms-2" />
                                </v-btn>

                                <div class="plan-card__features">
                                    <p v-if="plan.lead" class="plan-card__lead textPrimary">{{ plan.lead }}</p>
                                    <ul>
                                        <li v-for="feature in plan.features" :key="feature">
                                            <span class="feature-check"><CheckIcon size="15" stroke-width="2.5" /></span>
                                            <span>{{ feature }}</span>
                                        </li>
                                    </ul>
                                </div>
                            </article>
                        </v-col>
                    </v-row>
                </v-container>
            </section>

            <section class="pricing-assurances">
                <v-container class="max-width-1218">
                    <div v-reveal class="assurance-panel">
                        <div class="assurance-panel__intro">
                            <span class="assurance-panel__kicker">Inclus pour tous</span>
                            <h2 class="textPrimary">Simple aujourd’hui.<br />Flexible demain.</h2>
                        </div>
                        <div v-for="item in assurances" :key="item.title" class="assurance-item">
                            <div class="assurance-item__icon">
                                <component :is="item.icon" size="24" stroke-width="1.7" />
                            </div>
                            <div>
                                <h3 class="textPrimary">{{ item.title }}</h3>
                                <p class="text-medium-emphasis">{{ item.text }}</p>
                            </div>
                        </div>
                    </div>

                    <div v-reveal class="cancellation-note">
                        <ShieldCheckIcon size="24" stroke-width="1.7" />
                        <p>
                            <strong>Vous gardez le contrôle, même après résiliation.</strong>
                            Vos données restent consultables et exportables. Les fonctionnalités Premium passent simplement en lecture
                            seule.
                        </p>
                    </div>
                </v-container>
            </section>

            <section class="pricing-final-cta">
                <v-container class="max-width-1218 text-center">
                    <h2 class="textPrimary">Commencez à construire votre avenir financier</h2>
                    <p>Créez votre espace Spendup gratuitement. Aucune carte bancaire requise.</p>
                    <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth/register">
                        Commencer gratuitement
                        <ArrowRightIcon size="19" class="ms-2" />
                    </v-btn>
                </v-container>
            </section>
        </main>

        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/pricing';
</style>
