<script setup lang="ts">
import {
    ArrowRightIcon,
    BulbIcon,
    CheckIcon,
    HeartIcon,
    LockIcon,
    MapPinIcon,
    RocketIcon,
    ShieldCheckIcon,
    SparklesIcon,
    UserIcon
} from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import liamPhoto from '@/assets/images/profile/avatar/user-26.jpg';

const principles = [
    {
        icon: BulbIcon,
        title: 'Rendre simple ce qui ne l’est pas',
        text: 'Transformer des données financières dispersées en informations claires et directement utiles.'
    },
    {
        icon: UserIcon,
        title: 'Vous laisser le contrôle',
        text: 'Vos données, vos règles, vos choix de partage. Spendup s’adapte à votre façon de gérer.'
    },
    {
        icon: LockIcon,
        title: 'Protéger par défaut',
        text: 'La sécurité, la 2FA et la maîtrise des données sont intégrées à toutes les offres.'
    },
    {
        icon: RocketIcon,
        title: 'Évoluer avec vos besoins',
        text: 'Du budget quotidien au patrimoine familial, la plateforme grandit à votre rythme.'
    }
];

const commitments = [
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
            <section class="about-hero">
                <v-container class="max-width-1218">
                    <div class="about-hero__copy su-hero-in">
                        <v-chip color="primary" variant="tonal" rounded="pill" class="about-eyebrow">
                            <SparklesIcon size="15" class="me-2" />
                            Une histoire personnelle, une ambition collective
                        </v-chip>
                        <h1 class="textPrimary">Construire l’outil financier que j’aurais aimé avoir.</h1>
                        <p class="text-medium-emphasis">
                            Spendup est né d’un besoin simple : comprendre toute sa vie financière sans multiplier les fichiers, les
                            applications et les compromis.
                        </p>
                        <div class="about-hero__actions">
                            <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth?tab=register">
                                Découvrir Spendup
                                <ArrowRightIcon size="19" class="ms-2" />
                            </v-btn>
                            <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/fonctionnalites">
                                Voir les fonctionnalités
                            </v-btn>
                        </div>
                    </div>

                    <div class="founder-visual su-hero-visual-in">
                        <div class="founder-visual__glow"></div>
                        <div class="founder-card">
                            <img :src="liamPhoto" alt="Liam Santin, créateur de Spendup" />
                            <div class="founder-card__caption">
                                <span>Créé et développé par</span>
                                <strong>Liam Santin</strong>
                                <small>Fondateur &amp; développeur</small>
                            </div>
                        </div>
                        <div class="founder-note founder-note--location">
                            <MapPinIcon size="20" />
                            <div><strong>Conçu en Suisse</strong><small>Développé avec soin</small></div>
                        </div>
                        <div class="founder-note founder-note--mission">
                            <HeartIcon size="20" />
                            <div><strong>Une vision utile</strong><small>La clarté avant la complexité</small></div>
                        </div>
                    </div>
                </v-container>
            </section>

            <section class="about-story">
                <v-container class="max-width-1218">
                    <div v-reveal class="about-heading">
                        <span class="about-kicker">Pourquoi Spendup existe</span>
                        <h2 class="textPrimary">Une meilleure décision commence par une meilleure vision</h2>
                        <p class="text-medium-emphasis">
                            Les finances personnelles ne se résument pas à une liste de dépenses. Elles relient le quotidien, les projets,
                            la famille et le patrimoine.
                        </p>
                    </div>

                    <div v-reveal class="story-grid" data-reveal-stagger="110">
                        <article>
                            <span>01</span>
                            <h3 class="textPrimary">Le constat</h3>
                            <p class="text-medium-emphasis">
                                Comptes, contrats, objectifs et actifs vivent souvent dans des outils séparés qui ne racontent jamais toute
                                l’histoire.
                            </p>
                        </article>
                        <article>
                            <span>02</span>
                            <h3 class="textPrimary">L’idée</h3>
                            <p class="text-medium-emphasis">
                                Réunir toutes ces dimensions dans une plateforme cohérente, suffisamment simple pour le quotidien et assez
                                complète pour durer.
                            </p>
                        </article>
                        <article>
                            <span>03</span>
                            <h3 class="textPrimary">L’ambition</h3>
                            <p class="text-medium-emphasis">
                                Aider chacun à comprendre sa situation, anticiper les prochaines étapes et décider avec davantage de
                                confiance.
                            </p>
                        </article>
                    </div>
                </v-container>
            </section>

            <section class="about-principles">
                <v-container class="max-width-1218">
                    <div v-reveal class="about-heading">
                        <span class="about-kicker">Nos principes</span>
                        <h2 class="textPrimary">Des choix de produit guidés par l’essentiel</h2>
                    </div>

                    <div v-reveal class="principles-grid" data-reveal-stagger="90">
                        <article v-for="principle in principles" :key="principle.title">
                            <div class="principle-icon">
                                <component :is="principle.icon" size="25" stroke-width="1.65" />
                            </div>
                            <h3 class="textPrimary">{{ principle.title }}</h3>
                            <p class="text-medium-emphasis">{{ principle.text }}</p>
                        </article>
                    </div>
                </v-container>
            </section>

            <section class="about-swiss">
                <v-container class="max-width-1218">
                    <div v-reveal class="about-swiss__panel">
                        <div class="about-swiss__visual">
                            <div class="swiss-orbit swiss-orbit--outer"></div>
                            <div class="swiss-orbit swiss-orbit--inner"></div>
                            <div class="swiss-flag">
                                <svg viewBox="0 0 32 32" aria-hidden="true">
                                    <rect width="32" height="32" rx="7" fill="#DA291C" />
                                    <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                                    <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                                </svg>
                            </div>
                        </div>
                        <div class="about-swiss__copy">
                            <span class="about-kicker">Ancré en Suisse</span>
                            <h2>Conçu localement.<br />Pensé pour durer.</h2>
                            <p>
                                Spendup est développé en Suisse et vos données y sont hébergées. Cette proximité guide nos exigences en
                                matière de confidentialité, de fiabilité et de transparence.
                            </p>
                            <div class="about-swiss__facts">
                                <span><ShieldCheckIcon size="17" /> Données hébergées en Suisse</span>
                                <span><LockIcon size="17" /> Sécurité incluse pour tous</span>
                            </div>
                        </div>
                    </div>
                </v-container>
            </section>

            <section class="about-transparency">
                <v-container class="max-width-1218">
                    <div v-reveal class="transparency-layout">
                        <div>
                            <span class="about-kicker">Construit dans la transparence</span>
                            <h2 class="textPrimary">Un projet indépendant, encore en mouvement.</h2>
                            <p class="text-medium-emphasis">
                                Spendup est actuellement en version bêta. La plateforme évolue rapidement au fil des apprentissages et des
                                retours, avec une priorité constante : rester utile, fiable et honnête.
                            </p>
                        </div>
                        <ul>
                            <li v-for="commitment in commitments" :key="commitment">
                                <span><CheckIcon size="15" stroke-width="2.5" /></span>
                                {{ commitment }}
                            </li>
                        </ul>
                    </div>
                </v-container>
            </section>

            <section class="about-final">
                <v-container class="max-width-1218 text-center">
                    <span class="about-kicker">L’histoire ne fait que commencer</span>
                    <h2 class="textPrimary">Construisez une vision plus claire de vos finances.</h2>
                    <p>Essayez Spendup gratuitement, sans carte bancaire et sans engagement.</p>
                    <div class="about-final__actions">
                        <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth?tab=register">
                            Commencer gratuitement
                            <ArrowRightIcon size="19" class="ms-2" />
                        </v-btn>
                        <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">
                            Découvrir les offres
                        </v-btn>
                    </div>
                </v-container>
            </section>
        </main>

        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/about';
</style>
