<script setup lang="ts">
/**
 * Page Tarifs : même gabarit que Fonctionnalités et À propos (scss/frontpages/_page-blocks.scss).
 * Hero → 01 offres → 02 comparatif → 03 inclus pour tous → 04 questions → appel final.
 * Prix et quotas : catalogue décidé côté produit (le paiement n'est pas encore branché).
 */
import { ref } from 'vue';
import { ArrowRightIcon, CheckIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import { APP_SCREENSHOTS_PATH } from '@/data/front-pages/spendup-additional-domains';

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

const subscriptionShot = `${APP_SCREENSHOTS_PATH}/subscription.webp`;

const sectionIndex = [
    { id: 'offres', number: '01', label: 'Les offres' },
    { id: 'comparer', number: '02', label: 'Comparer' },
    { id: 'inclus', number: '03', label: 'Inclus pour tous' },
    { id: 'questions', number: '04', label: 'Questions' }
];

const plans: PricingPlan[] = [
    {
        code: 'free',
        name: 'Gratuit',
        description: 'Pour découvrir Spend.Up et suivre ses finances au quotidien.',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            'Jusqu’à 3 comptes',
            'Transactions, catégories et tiers',
            'Justificatifs PDF (30 Mo)',
            'Partage d’un compte entre amis',
            '1 budget et 3 récurrences'
        ],
        cta: 'Commencer gratuitement'
    },
    {
        code: 'student',
        name: 'Étudiant',
        description: 'Tout Solo, à tarif réduit. Justificatif étudiant demandé chaque année.',
        priceMonthly: 3.9,
        priceYearly: 35.1,
        lead: 'Tout Solo, à tarif réduit :',
        features: [
            'Jusqu’à 20 comptes',
            'Justificatifs PDF (300 Mo)',
            'Budgets et récurrences',
            'Imports de relevés CSV et Excel',
            'Plusieurs devises'
        ],
        cta: 'Choisir Étudiant'
    },
    {
        code: 'solo',
        name: 'Solo',
        description: 'Pour une personne, au quotidien.',
        priceMonthly: 6.9,
        priceYearly: 62.1,
        lead: 'Tout Gratuit, plus :',
        features: [
            'Jusqu’à 20 comptes',
            'Justificatifs PDF (300 Mo)',
            'Budgets et récurrences',
            'Imports de relevés CSV et Excel',
            'Plusieurs devises'
        ],
        cta: 'Choisir Solo',
        popular: true
    },
    {
        code: 'family',
        name: 'Famille',
        description: 'Un payeur et un foyer jusqu’à 5 personnes, propriétaire compris.',
        priceMonthly: 15.9,
        priceYearly: 143.1,
        lead: 'Tout Solo, plus :',
        features: [
            'Un foyer jusqu’à 5 membres',
            'Les membres profitent du plan, sans payer',
            'Jusqu’à 50 comptes',
            'Justificatifs PDF (10 Go)',
            'Les espaces personnels restent séparés'
        ],
        cta: 'Choisir Famille'
    }
];

type PlanCode = PricingPlan['code'];
type CompareValue = boolean | 'limited';

const comparisonRows: { label: string; values: Record<PlanCode, CompareValue> }[] = [
    { label: 'Comptes, transactions, catégories, tiers', values: { free: true, student: true, solo: true, family: true } },
    { label: 'Justificatifs PDF', values: { free: true, student: true, solo: true, family: true } },
    { label: 'Partage d’un compte entre amis', values: { free: true, student: true, solo: true, family: true } },
    { label: 'IBAN et numéros chiffrés (Coffre)', values: { free: true, student: true, solo: true, family: true } },
    { label: 'Budgets et récurrences', values: { free: 'limited', student: true, solo: true, family: true } },
    { label: 'Imports de relevés (CSV, Excel)', values: { free: false, student: true, solo: true, family: true } },
    { label: 'Plusieurs devises', values: { free: false, student: true, solo: true, family: true } },
    { label: 'Créer un foyer et y inviter', values: { free: false, student: false, solo: false, family: true } },
    { label: 'Rejoindre un foyer', values: { free: true, student: true, solo: true, family: true } }
];

const quotaRows: { label: string; values: Record<PlanCode, string> }[] = [
    { label: 'Comptes', values: { free: '3', student: '20', solo: '20', family: '50' } },
    { label: 'Stockage des justificatifs', values: { free: '30 Mo', student: '300 Mo', solo: '300 Mo', family: '10 Go' } },
    { label: 'Membres du foyer', values: { free: '–', student: '–', solo: '–', family: '5' } },
    { label: 'Fichiers envoyés par heure', values: { free: '30', student: '60', solo: '60', family: '120' } }
];

const included = [
    { title: 'Sans engagement', text: 'Vous changez d’offre ou résiliez quand vous le souhaitez.' },
    { title: 'Sécurité complète', text: 'Double authentification et gestion des appareils, dès le Gratuit.' },
    { title: 'Chiffré dans votre navigateur', text: 'Vos IBAN et numéros de compte sont illisibles pour tout le monde, même pour nous.' },
    { title: 'Hébergé en Suisse', text: 'Toutes les offres, chez Infomaniak, sous la loi suisse sur la protection des données.' }
];

const questions = [
    {
        title: 'Qui paie dans un foyer ?',
        text: 'Seul le propriétaire du foyer a besoin de l’offre Famille. Les membres le rejoignent avec leur propre compte, même gratuit, et profitent de son plan sur les ressources du foyer.'
    },
    {
        title: 'Comment fonctionne l’offre Étudiant ?',
        text: 'Elle donne exactement les mêmes droits que Solo, à prix réduit. Un justificatif est demandé chaque année : carte étudiante, certificat de scolarité ou adresse e-mail de votre école. À son expiration, l’abonnement passe au tarif Solo.'
    },
    {
        title: 'Le partage entre amis est-il payant ?',
        text: 'Non. Partager un compte avec un ami est inclus dès l’offre Gratuit. L’offre Famille sert à réunir un foyer entier sous un même plan.'
    },
    {
        title: 'Que se passe-t-il si je résilie ?',
        text: 'Vos données restent consultables. Les fonctionnalités des offres payantes passent simplement en lecture seule.'
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
    <div class="front-wraper page pricing-page">
        <AnnounceBar />
        <Header />

        <main>
            <section class="page-hero">
                <div class="s-container">
                    <div class="s-grid page-hero__grid">
                        <div class="page-hero__copy">
                            <h1 class="s-display su-hero-in">
                                Commencez gratuitement. <span class="s-primary">Évoluez à votre rythme.</span>
                            </h1>
                            <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                                Quatre offres simples, en francs suisses et sans engagement. La sécurité et l’hébergement en Suisse sont
                                inclus dans chacune.
                            </p>
                            <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                                <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Commencer gratuitement
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                            </div>
                            <ol class="page-hero__index su-hero-in" style="--su-in-delay: 240ms" aria-label="Sections de la page">
                                <li v-for="item in sectionIndex" :key="item.id">
                                    <a :href="`#${item.id}`"
                                        ><b>{{ item.number }}</b> {{ item.label }}</a
                                    >
                                </li>
                            </ol>
                        </div>

                        <figure class="s-figure page-hero__visual su-hero-visual-in" style="--su-in-delay: 160ms">
                            <img
                                :src="subscriptionShot"
                                alt="Page Abonnement de Spend.Up : plan courant, fonctionnalités incluses et quotas"
                                width="2160"
                                height="1350"
                                fetchpriority="high"
                            />
                            <figcaption>Votre offre, ses fonctionnalités et vos quotas, toujours visibles dans l’application.</figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            <!-- 01 : les offres, sur toute la largeur -->
            <section id="offres" class="s-section page-block page-block--tint page-block--wide">
                <div class="s-container">
                    <div class="s-grid page-block__grid">
                        <div v-reveal class="page-block__intro">
                            <span class="s-kicker"><b>01</b> Les offres</span>
                            <h2 class="s-h2">Quatre offres, sans engagement.</h2>
                            <p>Payez au mois, ou à l’année avec trois mois offerts. Les prix s’entendent TTC.</p>
                            <div class="billing-switch" role="group" aria-label="Période de facturation">
                                <button
                                    type="button"
                                    class="billing-switch__option"
                                    :class="{ 'billing-switch__option--active': billingPeriod === 'monthly' }"
                                    :aria-pressed="billingPeriod === 'monthly'"
                                    @click="billingPeriod = 'monthly'"
                                >
                                    Mensuel
                                </button>
                                <button
                                    type="button"
                                    class="billing-switch__option"
                                    :class="{ 'billing-switch__option--active': billingPeriod === 'yearly' }"
                                    :aria-pressed="billingPeriod === 'yearly'"
                                    @click="billingPeriod = 'yearly'"
                                >
                                    Annuel
                                    <span class="billing-switch__saving">3 mois offerts</span>
                                </button>
                            </div>
                        </div>

                        <div v-reveal class="page-block__body">
                            <ul class="plan-grid">
                                <li
                                    v-for="plan in plans"
                                    :key="plan.code"
                                    class="plan-card"
                                    :class="{ 'plan-card--popular': plan.popular }"
                                >
                                    <div class="plan-card__header">
                                        <h3 class="plan-card__name">{{ plan.name }}</h3>
                                        <span v-if="plan.popular" class="plan-card__badge">Le plus choisi</span>
                                    </div>
                                    <p class="plan-card__description">{{ plan.description }}</p>

                                    <div class="plan-card__price">
                                        <template v-if="plan.priceMonthly === 0">
                                            <span class="plan-card__amount">Gratuit</span>
                                            <span class="plan-card__price-note">pour toujours</span>
                                        </template>
                                        <template v-else>
                                            <div>
                                                <span class="plan-card__currency">Fr.</span>
                                                <span class="plan-card__amount">{{ displayedPrice(plan) }}</span>
                                                <span class="plan-card__period">/mois</span>
                                            </div>
                                            <span class="plan-card__price-note">
                                                {{
                                                    billingPeriod === 'yearly'
                                                        ? `Facturé ${yearlyTotal(plan)} Fr. par an`
                                                        : 'Facturé chaque mois'
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
                                    </v-btn>

                                    <div class="plan-card__features">
                                        <p v-if="plan.lead" class="plan-card__lead">{{ plan.lead }}</p>
                                        <ul>
                                            <li v-for="feature in plan.features" :key="feature">
                                                <CheckIcon size="15" stroke-width="2.5" class="plan-card__check" />
                                                <span>{{ feature }}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 02 : comparatif détaillé -->
            <section id="comparer" class="s-section page-block">
                <div class="s-container">
                    <div class="s-grid page-block__grid">
                        <div v-reveal class="page-block__intro">
                            <span class="s-kicker"><b>02</b> Comparer</span>
                            <h2 class="s-h2">Fonctionnalités et quotas, offre par offre.</h2>
                            <p>Étudiant et Solo donnent exactement les mêmes droits : seul le prix change.</p>
                        </div>

                        <div v-reveal class="page-block__body">
                            <div class="compare-scroll">
                                <table class="compare-table">
                                    <thead>
                                        <tr>
                                            <th scope="col" class="compare-table__feature-col">
                                                <span class="sr-only">Fonctionnalité</span>
                                            </th>
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
                                                <template v-if="row.values[plan.code] === true">
                                                    <CheckIcon size="17" stroke-width="2.6" aria-hidden="true" />
                                                    <span class="sr-only">Inclus</span>
                                                </template>
                                                <span v-else-if="row.values[plan.code] === 'limited'" class="compare-table__limited">
                                                    Limité
                                                </span>
                                                <span v-else class="compare-table__no">–<span class="sr-only"> Non inclus</span></span>
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
                                                class="compare-table__quota"
                                                :class="{ 'compare-table__plan--popular': plan.popular }"
                                            >
                                                {{ row.values[plan.code] }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 03 : ce qui ne dépend pas de l'offre -->
            <section id="inclus" class="s-section page-block page-block--dark">
                <div class="s-container">
                    <div class="s-grid page-block__grid">
                        <div v-reveal class="page-block__intro">
                            <span class="s-kicker"><b>03</b> Inclus pour tous</span>
                            <h2 class="s-h2">Simple aujourd’hui. Flexible demain.</h2>
                            <p>Ce qui protège vos données ne dépend jamais de l’offre choisie.</p>
                            <RouterLink to="/protection-des-donnees" class="page-block__link">
                                Protection des données <ArrowRightIcon size="14" />
                            </RouterLink>
                        </div>

                        <div v-reveal class="page-block__body">
                            <ul class="page-block__list">
                                <li v-for="item in included" :key="item.title">
                                    <h3>{{ item.title }}</h3>
                                    <p>{{ item.text }}</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 04 : les questions qui reviennent avant de choisir -->
            <section id="questions" class="s-section page-block page-block--tint page-block--flip">
                <div class="s-container">
                    <div class="s-grid page-block__grid">
                        <div v-reveal class="page-block__intro">
                            <span class="s-kicker"><b>04</b> Questions</span>
                            <h2 class="s-h2">Les réponses avant de choisir.</h2>
                            <p>Une autre question ? Écrivez-nous, nous répondons rapidement.</p>
                            <RouterLink to="/contact" class="page-block__link">Nous contacter <ArrowRightIcon size="14" /></RouterLink>
                        </div>

                        <div v-reveal class="page-block__body">
                            <ul class="page-block__list page-block__list--single">
                                <li v-for="question in questions" :key="question.title">
                                    <h3>{{ question.title }}</h3>
                                    <p>{{ question.text }}</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section class="page-final">
                <div class="s-container">
                    <div v-reveal class="s-grid page-final__grid">
                        <h2 class="page-final__title s-display">Votre vision financière <span>commence aujourd’hui.</span></h2>
                        <div class="page-final__side">
                            <p>Créez votre espace gratuitement. Aucune carte bancaire demandée.</p>
                            <div class="s-actions">
                                <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Créer mon espace
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/page-blocks';
@use '@/scss/frontpages/pages/pricing';

.plan-card__cta :deep(.v-btn__content) {
    flex-wrap: nowrap;
    white-space: nowrap;
}
</style>
