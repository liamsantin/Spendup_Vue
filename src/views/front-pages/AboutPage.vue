<script setup lang="ts">
import { ArrowRightIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import founderPhoto from '@/assets/images/profile/avatar/user-23.jpg';

const story = [
    {
        title: 'Le constat',
        text: 'Comptes, contrats, objectifs et actifs vivent souvent dans des outils séparés qui ne racontent jamais toute l’histoire.'
    },
    {
        title: 'L’idée',
        text: 'Un carnet de bord financier alimenté par vos propres relevés : simple pour le quotidien, assez complet pour réunir toutes ces dimensions, et durable puisqu’il ne dépend d’aucune banque.'
    },
    {
        title: 'L’ambition',
        text: 'Aider chacun à comprendre sa situation, anticiper les prochaines étapes et décider avec davantage de confiance.'
    }
];

const principles = [
    {
        title: 'Rendre simple ce qui ne l’est pas',
        text: 'Transformer des données financières dispersées en informations claires et directement utiles.'
    },
    {
        title: 'Vous laisser le contrôle',
        text: 'Spend.Up ne se connecte jamais à votre banque : vous décidez de ce que vous importez, et quand. Vos données, vos règles.'
    },
    {
        title: 'Protéger par défaut',
        text: 'La sécurité, la 2FA et la maîtrise des données sont intégrées à toutes les offres.'
    },
    {
        title: 'Évoluer avec vos besoins',
        text: 'Du budget quotidien au patrimoine familial, la plateforme grandit à votre rythme.'
    }
];

const swissFacts = [
    { label: 'Développement', value: 'Conçu et développé en Suisse' },
    { label: 'Hébergement', value: 'Données stockées en Suisse, chez Infomaniak' },
    { label: 'Cadre légal', value: 'Loi fédérale sur la protection des données (nLPD)' },
    { label: 'Sécurité', value: '2FA et gestion des appareils incluses pour tous' }
];

const commitments = [
    'Aucun accès à vos comptes bancaires, jamais',
    'Une tarification lisible, sans frais cachés',
    'Aucune revente de données personnelles',
    'Export et suppression des données à tout moment',
    'Une communication honnête sur les limites de la bêta'
];
</script>

<template>
    <div class="front-wraper about-page">
        <AnnounceBar />
        <Header />

        <main>
            <!-- Hero : texte à gauche, affiche suisse à droite -->
            <section class="about-hero">
                <div class="s-container">
                    <div class="s-grid about-hero__grid">
                        <div class="about-hero__copy">
                            <v-chip class="su-hero-in">Une histoire personnelle, une ambition collective</v-chip>
                            <h1 class="s-display su-hero-in" style="--su-in-delay: 80ms">
                                Construire l’outil financier <span class="s-primary">que j’aurais aimé avoir.</span>
                            </h1>
                            <p class="s-lead su-hero-in" style="--su-in-delay: 140ms">
                                Spend.Up est né d’un besoin simple : comprendre toute sa vie financière sans multiplier les fichiers, les
                                applications et les compromis, et sans confier ses accès bancaires à qui que ce soit.
                            </p>
                            <p class="about-hero__signature su-hero-in" style="--su-in-delay: 180ms">
                                Liam Santin — fondateur et développeur de Spend.Up, en Suisse
                            </p>
                            <div class="s-actions su-hero-in" style="--su-in-delay: 220ms">
                                <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Commencer gratuitement
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                                <v-btn size="x-large" variant="outlined" class="text-none" to="/fonctionnalites">
                                    Voir les fonctionnalités
                                </v-btn>
                            </div>
                        </div>

                        <figure class="about-poster su-hero-visual-in" style="--su-in-delay: 160ms">
                            <div class="about-poster__card">
                                <img :src="founderPhoto" alt="Liam Santin" class="about-poster__photo" />
                                <div class="about-poster__name">
                                    <p>Développé par</p>
                                    <h2>Liam Santin</h2>
                                </div>
                            </div>
                            <figcaption>
                                <span>Conçu et développé en Suisse</span>
                                <span>Données hébergées en Suisse</span>
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            <!-- Pourquoi : trois lignes de tableau numérotées -->
            <section class="s-section about-story">
                <div class="s-container">
                    <header v-reveal class="s-grid s-head">
                        <div class="s-head__label"><b>01</b> Pourquoi Spend.Up existe</div>
                        <div class="s-head__body">
                            <h2>Une meilleure décision commence par une meilleure vision.</h2>
                            <p>
                                Les finances personnelles ne se résument pas à une liste de dépenses. Elles relient le quotidien, les
                                projets, la famille et le patrimoine.
                            </p>
                        </div>
                    </header>

                    <ol v-reveal class="story-rows" data-reveal-stagger="110">
                        <li v-for="(step, index) in story" :key="step.title" class="s-grid">
                            <span class="story-rows__number">{{ String(index + 1).padStart(2, '0') }}</span>
                            <h3>{{ step.title }}</h3>
                            <p>{{ step.text }}</p>
                        </li>
                    </ol>
                </div>
            </section>

            <!-- Principes : matrice 2 × 2 à filets -->
            <section class="s-section about-principles">
                <div class="s-container">
                    <div class="s-grid principles">
                        <div v-reveal class="principles__intro">
                            <span class="s-kicker"><b>02</b> Nos principes</span>
                            <h2 class="s-h2">Des choix de produit guidés par l’essentiel.</h2>
                        </div>
                        <ul v-reveal class="principles__matrix" data-reveal-stagger="90">
                            <li v-for="(principle, index) in principles" :key="principle.title">
                                <span class="s-label">2.{{ index + 1 }}</span>
                                <h3>{{ principle.title }}</h3>
                                <p>{{ principle.text }}</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- Suisse : section rouge, déclaration à gauche, faits à droite -->
            <section class="s-section about-swiss">
                <div class="s-container">
                    <div v-reveal class="s-grid about-swiss__grid">
                        <div class="about-swiss__copy">
                            <span class="s-kicker"><b>03</b> Ancré en Suisse</span>
                            <h2 class="s-h2">Conçu localement. Pensé pour durer.</h2>
                            <p>
                                Spend.Up est développé en Suisse et vos données y sont hébergées. Cette proximité guide nos exigences en
                                matière de confidentialité, de fiabilité et de transparence.
                            </p>
                        </div>
                        <dl class="about-swiss__facts">
                            <div v-for="fact in swissFacts" :key="fact.label">
                                <dt>{{ fact.label }}</dt>
                                <dd>{{ fact.value }}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </section>

            <!-- Transparence : engagements numérotés -->
            <section class="s-section about-transparency">
                <div class="s-container">
                    <div v-reveal class="s-grid transparency">
                        <div class="transparency__copy">
                            <span class="s-kicker"><b>04</b> Construit dans la transparence</span>
                            <h2 class="s-h2">Un projet indépendant, encore en mouvement.</h2>
                            <p>
                                Spend.Up est actuellement en version bêta. La plateforme évolue rapidement au fil des apprentissages et des
                                retours, avec une priorité constante : rester utile, fiable et honnête.
                            </p>
                        </div>
                        <ol class="transparency__list">
                            <li v-for="commitment in commitments" :key="commitment">{{ commitment }}</li>
                        </ol>
                    </div>
                </div>
            </section>

            <section class="about-final">
                <div class="s-container">
                    <div v-reveal class="s-grid about-final__grid">
                        <h2 class="about-final__title s-display">
                            Construisez une vision plus claire <span class="s-primary">de vos finances.</span>
                        </h2>
                        <div class="about-final__side">
                            <p>Essayez Spend.Up gratuitement, sans carte bancaire et sans engagement.</p>
                            <div class="s-actions">
                                <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                    Commencer gratuitement
                                    <ArrowRightIcon size="18" class="ms-3" />
                                </v-btn>
                                <RouterLink to="/tarifs" class="about-final__link">Découvrir les offres</RouterLink>
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
@use '@/scss/frontpages/pages/about';
</style>
