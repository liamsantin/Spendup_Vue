<script setup lang="ts">
import { ref } from 'vue';
import { ArrowRightIcon, CheckIcon, DatabaseExportIcon, LockIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';

type BillingPeriod = 'monthly' | 'yearly';

interface PricingPlan {
    code: 'free' | 'student' | 'solo' | 'family';
    name: string;
    description: string;
    /** Prix TTC mensuel (CHF). 0 = gratuit. */
    priceMonthly: number;
    /** Prix TTC annuel (CHF), équivalent 9 mois (3 mois offerts). */
    priceYearly: number;
    lead?: string;
    features: string[];
    cta: string;
    popular?: boolean;
}

const billingPeriod = ref<BillingPeriod>('yearly');

const plans: PricingPlan[] = [
    {
        code: 'free',
        name: 'Gratuit',
        description: 'Pour découvrir Spend.Up et gérer ses finances au quotidien.',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            'Jusqu’à 3 comptes',
            'Transactions, catégories et tiers',
            'Justificatifs PDF (30 Mo)',
            'Partage d’un compte entre amis',
            'Budgets et récurrents limités (1 budget, 3 récurrences)',
            'Authentification sécurisée, 2FA et appareils',
            'Export et suppression des données'
        ],
        cta: 'Commencer gratuitement'
    },
    {
        code: 'student',
        name: 'Étudiant',
        description: 'Même produit que Solo, au tarif réduit. Justificatif étudiant annuel requis.',
        priceMonthly: 3.9,
        priceYearly: 35.1,
        lead: 'Tout Solo, à tarif réduit.',
        features: [
            'Jusqu’à 20 comptes',
            '300 Mo de justificatifs PDF',
            'Budgets et récurrents',
            'Imports de relevés',
            'Multi-devises et taux',
            'Partage de comptes entre amis',
            'Justificatif annuel (carte, certificat ou e-mail institutionnel)'
        ],
        cta: 'Choisir Étudiant'
    },
    {
        code: 'solo',
        name: 'Solo',
        description: 'Pour une personne, un usage quotidien.',
        priceMonthly: 6.9,
        priceYearly: 62.1,
        lead: 'Tout Gratuit, plus :',
        features: [
            'Jusqu’à 20 comptes',
            '300 Mo de justificatifs PDF',
            'Budgets et récurrents',
            'Imports de relevés',
            'Multi-devises et taux',
            'Partage de comptes entre amis',
            'Rejoindre un foyer Famille, sans le créer'
        ],
        cta: 'Choisir Solo',
        popular: true
    },
    {
        code: 'family',
        name: 'Famille (5)',
        description: 'Un payeur et un foyer jusqu’à 5 personnes (propriétaire inclus).',
        priceMonthly: 15.9,
        priceYearly: 143.1,
        lead: 'Tout Solo, plus :',
        features: [
            'Créer un foyer et y inviter',
            'Jusqu’à 5 membres (1 propriétaire + 4)',
            'Les membres héritent du plan du payeur',
            'Jusqu’à 50 comptes',
            '10 Go de justificatifs PDF',
            'Espaces personnels conservés séparément',
            'Un compte de foyer n’est pas partageable entre amis'
        ],
        cta: 'Choisir Famille'
    }
];

type PlanCode = PricingPlan['code'];
type CompareValue = boolean | 'limited';

const comparisonRows: { label: string; values: Record<PlanCode, CompareValue> }[] = [
    {
        label: 'Comptes, transactions, catégories, tiers',
        values: { free: true, student: true, solo: true, family: true }
    },
    {
        label: 'Justificatifs PDF',
        values: { free: true, student: true, solo: true, family: true }
    },
    {
        label: 'Partage de compte entre amis',
        values: { free: true, student: true, solo: true, family: true }
    },
    {
        label: 'Budgets et récurrents',
        values: { free: 'limited', student: true, solo: true, family: true }
    },
    {
        label: 'Imports de relevés',
        values: { free: false, student: true, solo: true, family: true }
    },
    {
        label: 'Multi-devises et taux',
        values: { free: false, student: true, solo: true, family: true }
    },
    {
        label: 'Créer un foyer et y inviter',
        values: { free: false, student: false, solo: false, family: true }
    },
    {
        label: 'Rejoindre un foyer (hériter du plan)',
        values: { free: true, student: true, solo: true, family: true }
    }
];

const quotaRows: { label: string; values: Record<PlanCode, string> }[] = [
    {
        label: 'Membres de foyer (propriétaire inclus)',
        values: { free: '0', student: '0', solo: '0', family: '5' }
    },
    {
        label: 'Stockage PDF (hors avatar)',
        values: { free: '30 Mo', student: '300 Mo', solo: '300 Mo', family: '10 Go' }
    },
    {
        label: 'Comptes',
        values: { free: '3', student: '20', solo: '20', family: '50' }
    },
    {
        label: 'Fichiers uploadés / heure',
        values: { free: '30', student: '60', solo: '60', family: '120' }
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

function formatChf(value: number): string {
    return value.toFixed(2).replace('.', ',');
}

function displayedPrice(plan: PricingPlan): string {
    if (plan.priceMonthly === 0) return '0';
    const monthlyPrice = billingPeriod.value === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;
    return formatChf(monthlyPrice);
}

function yearlyTotal(plan: PricingPlan): string {
    return formatChf(plan.priceYearly);
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
                        Quatre offres, zéro surprise
                    </v-chip>
                    <h1 class="pricing-title textPrimary su-hero-in" style="--su-in-delay: 80ms">
                        Un plan pour vous. Un foyer, si vous le voulez.
                    </h1>
                    <p class="pricing-subtitle text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                        Commencez gratuitement, sans carte. Étudiant au tarif réduit (justificatif annuel). Solo pour le quotidien. Famille
                        pour un payeur et jusqu’à quatre membres. Toutes les offres sont sans engagement.
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
                            <span class="billing-switch__saving">3 mois offerts</span>
                        </button>
                    </div>
                </v-container>
            </section>

            <section class="pricing-plans">
                <v-container class="max-width-1218">
                    <v-row v-reveal align="stretch" class="pricing-grid" data-reveal-stagger="90">
                        <v-col v-for="plan in plans" :key="plan.code" cols="12" sm="6" lg="3">
                            <article class="plan-card" :class="{ 'plan-card--popular': plan.popular }">
                                <div v-if="plan.popular" class="plan-card__badge">Le plus populaire</div>

                                <div class="plan-card__header">
                                    <h2 class="plan-card__name textPrimary">{{ plan.name }}</h2>
                                    <p class="plan-card__description text-medium-emphasis">{{ plan.description }}</p>
                                </div>

                                <div class="plan-card__price">
                                    <template v-if="plan.priceMonthly === 0">
                                        <span class="plan-card__amount textPrimary">Gratuit</span>
                                        <span class="plan-card__price-note">pour toujours</span>
                                    </template>
                                    <template v-else>
                                        <div>
                                            <span class="plan-card__currency">Fr.</span>
                                            <span class="plan-card__amount textPrimary">{{ displayedPrice(plan) }}</span>
                                            <span class="plan-card__period">/mois</span>
                                        </div>
                                        <span
                                            class="plan-card__price-note"
                                            :class="{ 'plan-card__price-note--yearly': billingPeriod === 'yearly' }"
                                        >
                                            {{
                                                billingPeriod === 'yearly'
                                                    ? `Facturé ${yearlyTotal(plan)} Fr. par an`
                                                    : 'Facturé mensuellement'
                                            }}
                                        </span>
                                    </template>
                                </div>

                                <v-btn
                                    :color="plan.popular ? 'primary' : undefined"
                                    :variant="plan.popular ? 'flat' : 'outlined'"
                                    block
                                    class="plan-card__cta text-none"
                                    to="/auth?tab=register"
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

            <section class="pricing-compare" aria-labelledby="pricing-compare-title">
                <v-container class="max-width-1218">
                    <div class="pricing-compare__intro">
                        <span class="pricing-compare__kicker">Comparer</span>
                        <h2 id="pricing-compare-title" class="textPrimary">Fonctionnalités et quotas, offre par offre</h2>
                    </div>
                    <div class="pricing-compare__scroll">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th scope="col" class="compare-table__feature-col">Offre</th>
                                    <th
                                        v-for="plan in plans"
                                        :key="plan.code"
                                        scope="col"
                                        :class="{ 'compare-table__plan--popular': plan.popular }"
                                    >
                                        {{ plan.name }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="compare-table__group">
                                    <th scope="colgroup" :colspan="plans.length + 1">Fonctionnalités</th>
                                </tr>
                                <tr v-for="row in comparisonRows" :key="row.label">
                                    <th scope="row">{{ row.label }}</th>
                                    <td
                                        v-for="plan in plans"
                                        :key="`${row.label}-${plan.code}`"
                                        :class="{ 'compare-table__plan--popular': plan.popular }"
                                    >
                                        <span v-if="row.values[plan.code] === true" class="compare-table__yes" title="Inclus">
                                            <CheckIcon size="18" stroke-width="2.6" aria-hidden="true" />
                                            <span class="sr-only">Inclus</span>
                                        </span>
                                        <span v-else-if="row.values[plan.code] === 'limited'" class="compare-table__limited"> Limité </span>
                                        <span v-else class="compare-table__no" title="Non inclus">
                                            -<span class="sr-only"> Non inclus</span>
                                        </span>
                                    </td>
                                </tr>
                                <tr class="compare-table__group">
                                    <th scope="colgroup" :colspan="plans.length + 1">Quotas</th>
                                </tr>
                                <tr v-for="row in quotaRows" :key="row.label">
                                    <th scope="row">{{ row.label }}</th>
                                    <td
                                        v-for="plan in plans"
                                        :key="`${row.label}-${plan.code}`"
                                        :class="{ 'compare-table__plan--popular': plan.popular }"
                                    >
                                        <span class="compare-table__quota">{{ row.values[plan.code] }}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p class="pricing-footnote text-medium-emphasis">
                        L’abonnement est porté par la personne, jamais par le foyer. Le partage d’un compte entre amis est inclus dès le
                        Gratuit. Seul Famille permet de créer un foyer : les membres n’ont pas besoin d’un plan payant, ils héritent de
                        celui du propriétaire. L’offre Étudiant a les mêmes droits et quotas que Solo, à un tarif réduit : un justificatif
                        annuel est requis ; à l’expiration, le compte passe au tarif Solo.
                    </p>
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
                            Vos données restent consultables et exportables. Les fonctionnalités des offres payantes passent simplement en
                            lecture seule.
                        </p>
                    </div>
                </v-container>
            </section>

            <section class="pricing-final-cta">
                <v-container class="max-width-1218 text-center">
                    <h2 class="textPrimary">Commencez à construire votre avenir financier</h2>
                    <p>Créez votre espace Spend.Up gratuitement. Aucune carte bancaire requise.</p>
                    <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth?tab=register">
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

.plan-card__cta :deep(.v-btn__content) {
    flex-wrap: nowrap;
    white-space: nowrap;
}
</style>
