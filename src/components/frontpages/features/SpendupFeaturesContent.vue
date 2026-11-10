<script setup lang="ts">
/**
 * Page Fonctionnalités : un hero, puis six sections bâties sur le même gabarit que l'accueil
 * (intitulé numéroté fixé à gauche, capture et liste à droite), puis l'appel final.
 * Chaque point décrit un écran qui existe dans l'application : rien d'annoncé à l'avance.
 */
import { ArrowRightIcon } from 'vue-tabler-icons';
import FeaturesHeroVisual from '@/components/frontpages/features/FeaturesHeroVisual.vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';
import { APP_SCREENSHOTS_PATH as SHOTS } from '@/data/front-pages/spendup-additional-domains';

const showPricing = isPricingPageEnabled();

interface FeatureItem {
    title: string;
    text: string;
}

interface FeatureSection {
    id: string;
    number: string;
    kicker: string;
    title: string;
    lead: string;
    /** Capture desktop, et sa version smartphone si elle existe (affichée sous 600 px). */
    shot?: { file: string; mobile?: string; alt: string };
    link?: { label: string; to: string };
    items: FeatureItem[];
    /** Composition de la section (voir _page-blocks.scss) ; par défaut, intitulé fixé à gauche. */
    layout?: Array<'wide' | 'flip' | 'dark' | 'numbered'>;
}

const sections: FeatureSection[] = [
    {
        id: 'quotidien',
        number: '01',
        layout: ['wide'],
        kicker: 'Au quotidien',
        title: 'Comprenez chaque mouvement de votre argent.',
        lead: 'Importez les relevés de votre e-banking : Spend.Up les lit, vous les relisez, puis tout est classé. Banques, cartes, TWINT et espèces se retrouvent dans une seule vue.',
        shot: {
            file: 'transactions.webp',
            mobile: 'mobile-transactions.webp',
            alt: 'Liste des transactions Spend.Up avec compte, catégorie, contrepartie et montant'
        },
        items: [
            {
                title: 'Tous vos comptes',
                text: 'Comptes bancaires, cartes, TWINT et espèces, en francs suisses, en euros, en dollars ou en livres.'
            },
            {
                title: 'Imports de relevés',
                text: 'Fichiers CSV ou Excel. Vous associez les colonnes une fois et les gardez comme modèle pour votre banque.'
            },
            {
                title: 'Relecture avant validation',
                text: 'Chaque ligne importée se vérifie et se corrige avant d’entrer dans vos comptes. Une ligne déjà importée est signalée.'
            },
            {
                title: 'Reconnaissance qui apprend',
                text: 'Tiers et moyens de paiement sont retrouvés automatiquement, grâce aux corrections que vous avez déjà faites.'
            }
        ]
    },
    {
        id: 'organiser',
        number: '02',
        layout: ['flip'],
        kicker: 'Organiser',
        title: 'Des données propres, classées, fiables.',
        lead: 'Catégories, étiquettes et tiers donnent à chaque opération sa place. Vos justificatifs restent rangés à côté.',
        shot: { file: 'categories.webp', alt: 'Arbre des catégories Spend.Up : alimentation, logement, loisirs, salaire, santé' },
        items: [
            { title: 'Catégories', text: 'Votre propre arbre de catégories, pour les dépenses comme pour les revenus.' },
            { title: 'Étiquettes', text: 'Un projet, un voyage, une personne : des repères qui traversent les catégories.' },
            { title: 'Tiers', text: 'Employeur, commerces, administrations et proches, avec leurs coordonnées.' },
            { title: 'Justificatifs PDF', text: 'Factures, reçus et contrats joints à vos opérations, toujours sous la main.' }
        ]
    },
    {
        id: 'planifier',
        number: '03',
        kicker: 'Planifier',
        title: 'Donnez une direction à votre budget.',
        lead: 'Passez du suivi à l’anticipation : des limites claires, des projets chiffrés et les échéances à venir sous les yeux.',
        shot: {
            file: 'budgets.webp',
            mobile: 'mobile-budgets.webp',
            alt: 'Budgets Spend.Up : alimentation et budget mensuel avec progression'
        },
        items: [
            {
                title: 'Budgets mensuels',
                text: 'Une enveloppe par catégorie, avec ce qu’il reste à dépenser. Une alerte vous prévient avant le dépassement.'
            },
            { title: 'Objectifs d’épargne', text: 'Vacances, fonds d’urgence ou achat important : suivez vos progrès vers chaque projet.' },
            { title: 'Revenus et charges récurrents', text: 'Salaire, loyer, crédits et abonnements, avec leurs prochaines échéances.' },
            { title: 'Calendrier', text: 'Le mois en un coup d’œil, avec revenus, charges et échéances au bon jour.' }
        ]
    },
    {
        id: 'patrimoine',
        number: '04',
        layout: ['wide', 'numbered'],
        kicker: 'Patrimoine',
        title: 'Pilotez votre patrimoine dans son ensemble.',
        lead: 'Ce que vous possédez, ce que vous devez et ce que vous préparez, réunis dans un patrimoine net toujours à jour.',
        items: [
            { title: 'Immobilier', text: 'Vos biens, leurs hypothèques et les loyers perçus.' },
            { title: 'Placements et crypto', text: 'Portefeuilles, positions, opérations et dividendes.' },
            { title: 'Véhicules et objets de valeur', text: 'Ce qui compte dans votre patrimoine, avec sa valeur au fil du temps.' },
            { title: 'Dettes et prêts', text: 'Crédits, prêts entre particuliers et remboursements, jusqu’au solde.' }
        ]
    },
    {
        id: 'partager',
        number: '05',
        layout: ['flip'],
        kicker: 'Partager',
        title: 'Gérez ensemble, sans tout mélanger.',
        lead: 'Couple, famille ou colocation : partagez ce qui est commun, et gardez le reste pour vous.',
        items: [
            { title: 'Amis', text: 'Ajoutez vos proches et choisissez qui peut vous trouver et vous envoyer une demande.' },
            {
                title: 'Comptes partagés',
                text: 'En lecture seule ou en modification, au choix. Vous décidez des champs visibles, l’IBAN compris.'
            },
            { title: 'Dépenses entre amis', text: 'Qui a avancé quoi, qui doit combien à qui, et les remboursements jusqu’au solde.' }
        ]
    },
    {
        id: 'securite',
        number: '06',
        layout: ['dark'],
        kicker: 'Sécurité',
        title: 'Protégé par défaut. Contrôlé par vous.',
        lead: showPricing
            ? 'Spend.Up n’a aucun accès à vos comptes bancaires. La sécurité est incluse dans toutes les offres, jamais vendue en option.'
            : 'Spend.Up n’a aucun accès à vos comptes bancaires. La sécurité est incluse par défaut, pour tout le monde.',
        shot: {
            file: 'security.webp',
            alt: 'Paramètres de sécurité Spend.Up : authentification à deux facteurs et appareils connectés'
        },
        link: { label: 'Protection des données', to: '/protection-des-donnees' },
        items: [
            { title: 'Aucun identifiant bancaire', text: 'Rien n’entre dans votre espace sans votre import.' },
            { title: 'Chiffré dans votre navigateur', text: 'Vos IBAN et numéros sont illisibles pour tout le monde, même pour nous.' },
            { title: 'Double authentification', text: 'Un code en plus du mot de passe, et la liste de vos appareils connectés.' },
            { title: 'Hébergé en Suisse', text: 'Chez Infomaniak, sous la loi suisse sur la protection des données.' }
        ]
    }
];
</script>

<template>
    <div class="page features-page">
        <section class="page-hero">
            <div class="s-container">
                <div class="s-grid page-hero__grid">
                    <div class="page-hero__copy">
                        <h1 class="s-display su-hero-in">
                            Tout ce qu’il faut pour piloter <span class="s-primary">votre vie financière.</span>
                        </h1>
                        <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                            Du premier budget au patrimoine familial, Spend.Up relie chaque donnée pour vous donner une vision claire, en
                            francs suisses. Sans jamais se connecter à votre banque.
                        </p>
                        <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                            <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <v-btn v-if="showPricing" size="x-large" variant="outlined" class="text-none" to="/tarifs"
                                >Voir les tarifs</v-btn
                            >
                        </div>
                        <ol class="page-hero__index su-hero-in" style="--su-in-delay: 240ms" aria-label="Sections de la page">
                            <li v-for="section in sections" :key="section.id">
                                <a :href="`#${section.id}`"
                                    ><b>{{ section.number }}</b> {{ section.kicker }}</a
                                >
                            </li>
                        </ol>
                    </div>

                    <div class="page-hero__visual page-hero__visual--wide su-hero-visual-in" style="--su-in-delay: 160ms">
                        <FeaturesHeroVisual />
                    </div>
                </div>
            </div>
        </section>

        <section
            v-for="(section, index) in sections"
            :id="section.id"
            :key="section.id"
            class="s-section page-block"
            :class="[
                { 'page-block--tint': index % 2 === 0 && !section.layout?.includes('dark') },
                ...(section.layout ?? []).map((variant) => `page-block--${variant}`)
            ]"
        >
            <div class="s-container">
                <div class="s-grid page-block__grid">
                    <div v-reveal class="page-block__intro">
                        <span class="s-kicker"
                            ><b>{{ section.number }}</b> {{ section.kicker }}</span
                        >
                        <h2 class="s-h2">{{ section.title }}</h2>
                        <p>{{ section.lead }}</p>
                        <RouterLink v-if="section.link" :to="section.link.to" class="page-block__link">
                            {{ section.link.label }} <ArrowRightIcon size="14" />
                        </RouterLink>
                    </div>

                    <div v-reveal class="page-block__body">
                        <figure
                            v-if="section.shot"
                            class="s-figure page-block__figure"
                            :class="{ 'page-block__figure--phone': section.shot.mobile }"
                        >
                            <picture>
                                <source
                                    v-if="section.shot.mobile"
                                    media="(max-width: 599px)"
                                    :srcset="`${SHOTS}/${section.shot.mobile}`"
                                    width="780"
                                    height="1688"
                                />
                                <img
                                    :src="`${SHOTS}/${section.shot.file}`"
                                    :alt="section.shot.alt"
                                    width="2160"
                                    height="1350"
                                    loading="lazy"
                                />
                            </picture>
                        </figure>

                        <ul class="page-block__list">
                            <li v-for="item in section.items" :key="item.title">
                                <h3>{{ item.title }}</h3>
                                <p>{{ item.text }}</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section class="page-final">
            <div class="s-container">
                <div v-reveal class="s-grid page-final__grid">
                    <h2 class="page-final__title s-display">Découvrez une autre façon <span>de gérer vos finances.</span></h2>
                    <div class="page-final__side">
                        <p>{{ showPricing ? 'Commencez gratuitement, sans engagement.' : 'Il ne vous faut qu’une adresse e-mail.' }}</p>
                        <div class="s-actions">
                            <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Créer mon espace
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink v-if="showPricing" to="/tarifs" class="page-final__link">Comparer les offres</RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/page-blocks';
</style>
