<script setup lang="ts">
import { ArrowRightIcon, BrandWindowsIcon, ExternalLinkIcon } from 'vue-tabler-icons';
import infomaniakLogo from '@/assets/images/front-pages/infomaniak-logo.svg';
import { APP_SCREENSHOTS_PATH as SHOTS, spendupDomainNames } from '@/data/front-pages/spendup-additional-domains';

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

const steps = [
    {
        title: 'Créez votre espace',
        text: 'Une adresse e-mail suffit. Aucune carte bancaire, aucun engagement : votre espace est prêt en moins d’une minute.',
        meta: 'Gratuit, sans carte'
    },
    {
        title: 'Importez vos relevés',
        text: 'Exportez vos relevés depuis votre e-banking et déposez-les dans Spend.Up. Il reconnaît les colonnes, vous relisez, vous validez.',
        meta: 'CSV & Excel'
    },
    {
        title: 'Organisez, décidez',
        text: 'Catégories, tiers et justificatifs PDF se mettent en place. Budgets et objectifs transforment ensuite vos chiffres en décisions.',
        meta: 'Justificatifs PDF liés'
    }
];

/** Pourquoi Spend.Up ne se connecte pas à la banque : la contrainte présentée comme un choix. */
const noBankLinkReasons = [
    {
        title: 'Aucun accès à vos comptes',
        text: 'Spend.Up ne vous demande jamais vos identifiants e-banking et ne peut ni consulter ni déplacer votre argent.'
    },
    {
        title: 'Vous choisissez ce qui entre',
        text: 'Vous importez les relevés que vous voulez, quand vous le voulez. Rien n’arrive dans votre espace sans votre accord.'
    },
    {
        title: 'Toutes les banques, sans partenariat',
        text: 'Si votre banque permet d’exporter vos relevés en CSV ou en Excel, elle est compatible. Aucune intégration à attendre.'
    },
    {
        title: 'Un historique qui vous appartient',
        text: 'Année après année, votre carnet de bord s’enrichit. Il reste exportable et ne dépend d’aucune banque.'
    }
];

/** Fiche technique de l’hébergement : uniquement des faits vérifiables, une ligne par sujet. */
const hostingSpecs = [
    { label: 'Hébergeur', value: 'Infomaniak, entreprise suisse indépendante fondée à Genève en 1994' },
    { label: 'Localisation', value: 'Centres de données situés en Suisse, aucun stockage à l’étranger' },
    { label: 'Cadre légal', value: 'Loi fédérale sur la protection des données (nLPD)' },
    { label: 'Données hébergées', value: 'Base de données, documents & justificatifs, sauvegardes' },
    { label: 'Énergie', value: 'Électricité renouvelable, chaleur des serveurs valorisée' }
];

const faqs = [
    {
        question: 'Spend.Up se connecte-t-il à ma banque ?',
        answer: 'Non, et c’est un choix. Spend.Up ne vous demande jamais vos identifiants bancaires et n’a aucun accès à vos comptes. Vous exportez vos relevés depuis votre e-banking, puis vous les importez dans Spend.Up quand vous le souhaitez.'
    },
    {
        question: 'Quels fichiers puis-je importer ?',
        answer: 'Vos relevés de transactions au format CSV ou Excel (XLSX), proposés par la plupart des banques. Spend.Up reconnaît les colonnes, vous laisse vérifier chaque ligne avant validation et mémorise le modèle pour vos prochains imports. Vos justificatifs (factures, reçus, contrats) se joignent en PDF à vos opérations.'
    },
    {
        question: 'Mes soldes sont-ils à jour en permanence ?',
        answer: 'Ils sont à jour de votre dernier import et de vos saisies. Importez au rythme qui vous convient, chaque semaine ou chaque mois : Spend.Up vous signale les doublons possibles pour que rien ne soit compté deux fois.'
    },
    {
        question: 'Puis-je commencer gratuitement ?',
        answer: 'Oui. L’offre Gratuit ne nécessite aucune carte bancaire : vous y saisissez vos opérations et joignez vos justificatifs PDF. L’import de relevés est inclus dès l’offre Étudiant ou Solo.'
    },
    {
        question: 'Mes données sont-elles sécurisées ?',
        answer: 'Oui. Spend.Up intègre notamment la 2FA, la gestion des appareils et des mécanismes de protection des accès.'
    },
    {
        question: 'Puis-je utiliser Spend.Up en famille ?',
        answer: 'Oui. L’offre Famille (5) permet à un payeur de créer un foyer jusqu’à 5 personnes (propriétaire inclus). Les membres héritent du plan du propriétaire et n’ont pas besoin d’un abonnement payant.'
    },
    {
        question: 'Où sont hébergées mes données ?',
        answer: 'En Suisse, chez Infomaniak. Vos comptes, transactions et documents sont stockés dans des centres de données situés en Suisse et relèvent du droit suisse sur la protection des données (nLPD).'
    },
    {
        question: 'Sur quels appareils puis-je utiliser Spend.Up ?',
        answer: 'Depuis n’importe quel navigateur récent, sur ordinateur comme sur smartphone, ou via l’application Windows. Vos données restent synchronisées d’un appareil à l’autre.'
    },
    {
        question: 'Que deviennent mes données après résiliation ?',
        answer: 'Elles restent consultables et exportables. Seules les fonctionnalités Premium passent en lecture seule.'
    }
];
</script>

<template>
    <div class="home-page">
        <!-- Hero : texte à gauche, produit réel à droite qui déborde jusqu’au bord de l’écran -->
        <section class="home-hero">
            <div class="s-container">
                <div class="s-grid home-hero__grid">
                    <div class="home-hero__copy">
                        <h1 class="s-display su-hero-in">
                            Votre carnet de bord financier, <span class="s-primary">alimenté par vos relevés.</span>
                        </h1>
                        <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                            Importez les relevés de votre banque, joignez vos justificatifs : Spend.Up classe, relie et transforme votre
                            historique en budgets, objectifs et décisions. Sans jamais accéder à vos comptes.
                        </p>
                        <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                            <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <v-btn size="x-large" variant="outlined" class="text-none" to="/fonctionnalites">Découvrir Spend.Up</v-btn>
                        </div>
                        <p class="home-hero__note su-hero-in" style="--su-in-delay: 240ms">
                            Gratuit pour commencer · Sans carte bancaire · Données hébergées en Suisse
                        </p>
                    </div>

                    <div class="home-hero__visual su-hero-visual-in" style="--su-in-delay: 160ms">
                        <img
                            class="home-hero__desktop"
                            :src="`${SHOTS}/dashboard.jpg`"
                            alt="Tableau de bord Spend.Up : solde visible, revenus et dépenses du mois, dépenses par catégorie et comptes"
                            width="2160"
                            height="1350"
                            fetchpriority="high"
                        />
                        <img
                            class="home-hero__phone"
                            :src="`${SHOTS}/mobile-dashboard.jpg`"
                            alt="Le même tableau de bord sur smartphone"
                            width="780"
                            height="1688"
                        />
                    </div>
                </div>
            </div>
        </section>

        <section class="home-figures">
            <div class="s-container">
                <dl v-reveal class="s-grid home-figures__grid" data-reveal-stagger="70">
                    <div>
                        <dt>{{ spendupDomainNames.length }}</dt>
                        <dd>domaines métiers réunis</dd>
                    </div>
                    <div>
                        <dt>100&thinsp;%</dt>
                        <dd>des données en Suisse</dd>
                    </div>
                    <div>
                        <dt>2FA</dt>
                        <dd>incluse pour chaque compte</dd>
                    </div>
                    <div>
                        <dt class="s-red">0</dt>
                        <dd>accès à vos comptes bancaires</dd>
                    </div>
                </dl>
            </div>
        </section>

        <!-- 01 : étapes en colonne, capture fixe à droite pendant le défilement -->
        <section id="comment-ca-marche" class="s-section">
            <div class="s-container">
                <div class="s-grid how">
                    <div class="how__copy">
                        <header v-reveal class="how__head">
                            <span class="s-kicker"><b>01</b> Comment ça marche</span>
                            <h2 class="s-h2">Trois étapes pour y voir clair.</h2>
                            <p>
                                Un relevé exporté depuis votre e-banking suffit pour démarrer. Chaque import nourrit ensuite votre carnet de
                                bord : catégories, budgets, objectifs et échéances.
                            </p>
                        </header>

                        <ol v-reveal class="how__steps" data-reveal-stagger="120">
                            <li v-for="(step, index) in steps" :key="step.title">
                                <span class="how__number">{{ index + 1 }}</span>
                                <div>
                                    <h3>{{ step.title }}</h3>
                                    <p>{{ step.text }}</p>
                                    <span class="s-label">{{ step.meta }}</span>
                                </div>
                            </li>
                        </ol>
                    </div>

                    <figure v-reveal class="s-figure how__figure">
                        <img
                            :src="`${SHOTS}/transactions.jpg`"
                            alt="Liste des transactions Spend.Up avec compte, catégorie, contrepartie et montant"
                            width="2160"
                            height="1350"
                            loading="lazy"
                        />
                        <figcaption><b>Fig. 1</b> Transactions importées, classées par compte, catégorie et contrepartie</figcaption>
                    </figure>
                </div>
            </div>
        </section>

        <!-- 02 : section sombre, affirmation à gauche, raisons numérotées à droite -->
        <section id="sans-connexion-bancaire" class="s-section home-nobank">
            <div class="s-container">
                <div v-reveal class="s-grid nobank">
                    <div class="nobank__statement">
                        <span class="s-kicker"><b>02</b> Sans connexion bancaire</span>
                        <h2 class="s-h2">Spend.Up ne se connecte pas à votre banque. <span>Et c’est voulu.</span></h2>
                        <p>
                            Pas d’identifiants à confier, pas d’accès permanent à vos comptes. Vous gardez la main sur ce qui entre dans
                            votre espace, Spend.Up se charge de le rendre lisible.
                        </p>
                    </div>

                    <ol class="nobank__reasons" data-reveal-stagger="80">
                        <li v-for="(reason, index) in noBankLinkReasons" :key="reason.title">
                            <span class="nobank__index">{{ String(index + 1).padStart(2, '0') }}</span>
                            <div>
                                <h3>{{ reason.title }}</h3>
                                <p>{{ reason.text }}</p>
                            </div>
                        </li>
                    </ol>

                    <p class="nobank__note">
                        <b>La contrepartie, en toute transparence :</b> vos soldes sont à jour de votre dernier import. Importez chaque
                        semaine ou chaque mois, à votre rythme.
                    </p>
                </div>
            </div>
        </section>

        <!-- 03 : fiche technique de l’hébergement -->
        <section id="hebergement" class="s-section home-hosting">
            <div class="s-container">
                <div v-reveal class="s-grid hosting">
                    <div class="hosting__intro">
                        <span class="s-kicker"><b>03</b> Hébergement</span>
                        <h2 class="s-h2">Vos données restent en Suisse, <span class="s-primary">chez Infomaniak.</span></h2>
                        <p>
                            Spend.Up confie l’intégralité de vos données à un hébergeur suisse, sans détour par un cloud étranger. Voici, en
                            clair, ce que cela recouvre.
                        </p>
                        <div class="hosting__brand">
                            <img :src="infomaniakLogo" alt="Infomaniak" class="hosting__logo" width="244" height="32" />
                            <a href="https://www.infomaniak.com" target="_blank" rel="noopener noreferrer" class="hosting__link">
                                infomaniak.com
                                <ExternalLinkIcon size="15" />
                            </a>
                        </div>
                    </div>

                    <dl class="hosting__specs">
                        <div v-for="spec in hostingSpecs" :key="spec.label">
                            <dt>{{ spec.label }}</dt>
                            <dd>{{ spec.value }}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>

        <!-- 04 : appareils à gauche, texte à droite -->
        <section class="s-section">
            <div class="s-container">
                <div v-reveal class="s-grid anywhere">
                    <div class="anywhere__devices">
                        <figure class="s-figure s-figure--phone">
                            <img
                                :src="`${SHOTS}/mobile-transactions.jpg`"
                                alt="Les transactions Spend.Up sur smartphone"
                                width="780"
                                height="1688"
                                loading="lazy"
                            />
                            <figcaption><b>Fig. 2</b> Transactions</figcaption>
                        </figure>
                        <figure class="s-figure s-figure--phone">
                            <img
                                :src="`${SHOTS}/mobile-due-dates.jpg`"
                                alt="Les échéances à venir dans Spend.Up sur smartphone"
                                width="780"
                                height="1688"
                                loading="lazy"
                            />
                            <figcaption><b>Fig. 3</b> Échéances</figcaption>
                        </figure>
                    </div>

                    <div class="anywhere__copy">
                        <span class="s-kicker"><b>04</b> Disponible partout</span>
                        <h2 class="s-h2">Votre espace financier vous suit, pas l’inverse.</h2>
                        <p>
                            Consultez Spend.Up depuis votre navigateur, sur ordinateur comme sur smartphone, ou installez l’application
                            Windows : vos données restent synchronisées d’un appareil à l’autre.
                        </p>
                        <ul class="anywhere__platforms">
                            <li><span>Navigateur</span>Chrome, Edge, Firefox, Safari</li>
                            <li><span>Smartphone</span>iPhone et Android, depuis le navigateur</li>
                            <li><span>Ordinateur</span>Application Windows 10/11 · 64 bits</li>
                        </ul>
                        <v-btn color="primary" size="large" flat class="text-none" :href="windowsDownloadUrl" download>
                            <BrandWindowsIcon size="18" class="me-2" />
                            Télécharger pour Windows
                        </v-btn>
                    </div>
                </div>
            </div>
        </section>

        <!-- 05 : titre fixe à gauche, questions à droite -->
        <section id="questions" class="s-section home-faq">
            <div class="s-container">
                <div class="s-grid faq">
                    <div class="faq__aside">
                        <span class="s-kicker"><b>05</b> Questions fréquentes</span>
                        <h2 class="s-h2">Tout ce qu’il faut savoir avant de commencer.</h2>
                        <p>
                            Une autre question ?
                            <RouterLink to="/contact">Écrivez-nous</RouterLink>
                        </p>
                    </div>
                    <v-expansion-panels v-reveal class="faq__list" elevation="0">
                        <v-expansion-panel v-for="faq in faqs" :key="faq.question" elevation="0">
                            <v-expansion-panel-title>{{ faq.question }}</v-expansion-panel-title>
                            <v-expansion-panel-text>{{ faq.answer }}</v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </div>
            </div>
        </section>

        <section id="commencer" class="home-final">
            <div class="s-container">
                <div v-reveal class="s-grid home-final__grid">
                    <h2 class="home-final__title s-display">Commencez simplement. <span>Évoluez à votre rythme.</span></h2>
                    <div class="home-final__side">
                        <p>Créez votre espace gratuitement, sans carte bancaire et sans engagement.</p>
                        <div class="s-actions">
                            <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink to="/tarifs" class="home-final__link">Voir les tarifs</RouterLink>
                        </div>
                        <p class="home-final__beta">
                            Spend.Up est en version bêta : les données peuvent être réinitialisées sans préavis pendant cette phase.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/home-content';
</style>
