<script setup lang="ts">
/**
 * Page À propos : même gabarit que Fonctionnalités et Tarifs (scss/frontpages/_page-blocks.scss).
 * Hero avec le portrait et le nom du fondateur → 01 pourquoi → 02 principes
 * → 03 ancré en Suisse → 04 transparence → appel final.
 */
import { ArrowRightIcon } from 'vue-tabler-icons';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import founderPhoto from '@/assets/images/profile/avatar/user-26.jpg';

const showPricing = isPricingPageEnabled();

interface AboutItem {
    title: string;
    text: string;
}

interface AboutSection {
    id: string;
    number: string;
    kicker: string;
    title: string;
    lead: string;
    items: AboutItem[];
    /** Une colonne pour les textes longs, deux sinon. */
    single?: boolean;
    link?: { label: string; to: string };
    /** Composition de la section (voir _page-blocks.scss) ; par défaut, intitulé fixé à gauche. */
    layout?: Array<'wide' | 'flip' | 'dark' | 'numbered'>;
}

const sections: AboutSection[] = [
    {
        id: 'pourquoi',
        number: '01',
        layout: ['wide', 'numbered'],
        kicker: 'Pourquoi Spend.Up existe',
        title: 'Une meilleure décision commence par une meilleure vision.',
        lead: 'Les finances personnelles ne se résument pas à une liste de dépenses. Elles relient le quotidien, les projets, la famille et le patrimoine.',
        items: [
            {
                title: 'Le constat',
                text: 'Comptes, contrats, objectifs et biens vivent souvent dans des outils séparés, qui ne racontent jamais toute l’histoire.'
            },
            {
                title: 'L’idée',
                text: 'Un carnet de bord financier alimenté par vos propres relevés : simple au quotidien, assez complet pour tout réunir, et durable puisqu’il ne dépend d’aucune banque.'
            },
            {
                title: 'L’ambition',
                text: 'Aider chacun à comprendre sa situation, anticiper les prochaines étapes et décider avec davantage de confiance.'
            }
        ]
    },
    {
        id: 'principes',
        number: '02',
        kicker: 'Nos principes',
        title: 'Des choix de produit guidés par l’essentiel.',
        lead: 'Quatre règles décident de ce qui entre dans Spend.Up, et de ce qui n’y entrera pas.',
        items: [
            {
                title: 'Rendre simple ce qui ne l’est pas',
                text: 'Transformer des données financières dispersées en informations claires et directement utiles.'
            },
            {
                title: 'Vous laisser le contrôle',
                text: 'Spend.Up ne se connecte jamais à votre banque : vous décidez de ce que vous importez, et quand.'
            },
            {
                title: 'Protéger par défaut',
                text: showPricing
                    ? 'Double authentification et chiffrement de vos données sensibles, dans toutes les offres.'
                    : 'Double authentification et chiffrement de vos données sensibles, pour tout le monde.'
            },
            {
                title: 'Évoluer avec vos besoins',
                text: 'Du budget du mois au patrimoine familial, la plateforme grandit à votre rythme.'
            }
        ]
    },
    {
        id: 'suisse',
        number: '03',
        layout: ['dark'],
        kicker: 'Ancré en Suisse',
        title: 'Conçu localement. Pensé pour durer.',
        lead: 'Spend.Up est développé en Suisse et vos données y sont hébergées. Cette proximité guide nos exigences de confidentialité, de fiabilité et de transparence.',
        link: { label: 'Protection des données', to: '/protection-des-donnees' },
        items: [
            { title: 'Développé en Suisse', text: 'Conçu, développé et maintenu en Suisse, de façon indépendante.' },
            { title: 'Hébergé chez Infomaniak', text: 'Vos données, vos documents et les sauvegardes restent en Suisse.' },
            { title: 'Sous la loi suisse', text: 'Loi fédérale sur la protection des données (nLPD).' },
            {
                title: 'Chiffré dans votre navigateur',
                text: 'Vos IBAN et numéros de compte sont illisibles pour tout le monde, même pour nous.'
            }
        ]
    },
    {
        id: 'transparence',
        number: '04',
        layout: ['flip'],
        kicker: 'Transparence',
        title: 'Un projet indépendant, encore en mouvement.',
        lead: 'Spend.Up est en version bêta. La plateforme évolue vite, au fil des retours, avec une priorité constante : rester utile, fiable et honnête.',
        items: [
            { title: 'Aucun accès à votre banque', text: 'Spend.Up ne vous demandera jamais vos identifiants bancaires.' },
            { title: 'Aucune revente de données', text: 'Vos données servent uniquement à faire fonctionner Spend.Up.' },
            ...(showPricing
                ? [{ title: 'Une tarification lisible', text: 'Des offres simples, en francs suisses, sans frais cachés.' }]
                : []),
            { title: 'Vos données restent les vôtres', text: 'Vous pouvez supprimer votre compte et toutes vos données à tout moment.' },
            { title: 'Une bêta assumée', text: 'Les limites de la version bêta sont annoncées clairement, sans promesse en l’air.' }
        ]
    }
];
</script>

<template>
    <div class="front-wraper page about-page">
        <AnnounceBar />
        <Header />

        <main>
            <section class="page-hero">
                <div class="s-container">
                    <div class="s-grid page-hero__grid">
                        <div class="page-hero__copy">
                            <h1 class="s-display su-hero-in">
                                Construire l’outil financier <span class="s-primary">que j’aurais aimé avoir.</span>
                            </h1>
                            <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                                Spend.Up est né d’un besoin simple : comprendre toute sa vie financière sans multiplier les fichiers, les
                                applications et les compromis, et sans confier ses accès bancaires à qui que ce soit.
                            </p>
                            <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                                <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Commencer gratuitement
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                                <RouterLink to="/fonctionnalites" class="page-block__link">Voir les fonctionnalités</RouterLink>
                            </div>
                            <ol class="page-hero__index su-hero-in" style="--su-in-delay: 240ms" aria-label="Sections de la page">
                                <li v-for="section in sections" :key="section.id">
                                    <a :href="`#${section.id}`"
                                        ><b>{{ section.number }}</b> {{ section.kicker }}</a
                                    >
                                </li>
                            </ol>
                        </div>

                        <figure class="page-hero__visual about-poster su-hero-visual-in" style="--su-in-delay: 160ms">
                            <div class="about-poster__card">
                                <img
                                    :src="founderPhoto"
                                    alt="Liam Santin, fondateur et développeur de Spend.Up"
                                    class="about-poster__photo"
                                />
                                <div class="about-poster__plate">
                                    <span class="about-poster__kicker">Développé par</span>
                                    <p class="about-poster__role">Liam Santin</p>
                                    <span class="about-poster__note">Fondateur et développeur, en Suisse</span>
                                </div>
                            </div>
                        </figure>
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
                            <ul class="page-block__list" :class="{ 'page-block__list--single': section.single }">
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
                        <h2 class="page-final__title s-display">Construisez une vision plus claire <span>de vos finances.</span></h2>
                        <div class="page-final__side">
                            <p>
                                {{
                                    showPricing
                                        ? 'Essayez Spend.Up gratuitement, sans engagement.'
                                        : 'Il ne vous faut qu’une adresse e-mail pour commencer.'
                                }}
                            </p>
                            <div class="s-actions">
                                <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Créer mon espace
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                                <RouterLink v-if="showPricing" to="/tarifs" class="page-final__link">Découvrir les offres</RouterLink>
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
@use '@/scss/frontpages/pages/about';
</style>
