<script setup lang="ts">
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';
import { ArrowRightIcon, BrandWindowsIcon, ExternalLinkIcon, LockIcon } from 'vue-tabler-icons';
import SwissFlag from '@/components/frontpages/shared/SwissFlag.vue';
import infomaniakLogo from '@/assets/images/front-pages/infomaniak-logo.svg';
import { APP_SCREENSHOTS_PATH as SHOTS } from '@/data/front-pages/spendup-additional-domains';

const showPricing = isPricingPageEnabled();

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

/** Les trois bénéfices : une capture smartphone réelle, un titre, une ligne. */
const benefits = [
    {
        title: 'Voir clair',
        text: 'Chaque dépense classée par catégorie, compte et contrepartie.',
        shot: 'mobile-transactions.webp',
        alt: 'Les transactions Spend.Up sur smartphone, classées par jour'
    },
    {
        title: 'Anticiper',
        text: 'Loyer, salaire, abonnements : vos échéances avant la fin du mois.',
        shot: 'mobile-due-dates.webp',
        alt: 'Les échéances à venir dans Spend.Up sur smartphone'
    },
    {
        title: 'Construire',
        text: 'Des budgets et des objectifs qui avancent à chaque import.',
        shot: 'mobile-budgets.webp',
        alt: 'Les budgets Spend.Up sur smartphone avec leur progression'
    }
];

const steps = [
    {
        title: 'Créez votre espace',
        text: showPricing
            ? 'Une adresse e-mail ou votre compte Google suffit, et l’offre gratuite ne demande aucune carte bancaire. Avec un mot de passe, votre Coffre se crée au passage, sans réglage.'
            : 'Une adresse e-mail ou votre compte Google suffit. Avec un mot de passe, votre Coffre se crée au passage, sans réglage.'
    },
    {
        title: 'Importez vos relevés',
        text: 'Exportez un fichier CSV ou Excel depuis votre e-banking et associez ses colonnes une fois, puis gardez-les comme modèle pour les imports suivants. Vous relisez chaque ligne avant de la valider.'
    },
    {
        title: 'Pilotez',
        text: 'Budgets, objectifs d’épargne, paiements récurrents et patrimoine, au même endroit. Une alerte vous prévient quand un budget approche de sa limite.'
    }
];

/**
 * Impôts : le parcours d’un dossier, de sa création au solde. Chaque point décrit un écran
 * qui existe dans le module (voir aussi la section « Impôts » de la page Fonctionnalités).
 */
const taxPhases = [
    {
        title: 'Préparer',
        text: 'Une déclaration par année et par canton, pour une ou deux personnes. Repartez du PDF d’une déclaration existante ou de celle de l’an dernier : situation et fiches sont reprises, jamais les montants.'
    },
    {
        title: 'Remplir',
        text: 'Revenus, prévoyance, santé, famille, déductions, fortune et dettes : des étapes courtes, avec les cases remplies et celles qu’il reste à compléter.'
    },
    {
        title: 'Déposer',
        text: 'Exportez le récapitulatif à recopier dans le logiciel officiel, avec vos justificatifs numérotés. Une fois la déclaration marquée déposée, ses montants sont verrouillés et chaque correction est journalisée.'
    },
    {
        title: 'Suivre',
        text: 'Décision de taxation, écarts avec ce que vous aviez déclaré, acomptes et solde : chaque tranche se rapproche de vos paiements, jusqu’au dossier soldé.'
    }
];

/** Les statuts d’un dossier, dans l’ordre où il les traverse. */
const taxStatuses = ['En cours', 'Prête à recopier', 'Déposée', 'Taxée', 'Soldée'];

/** Ce que le module propose à partir des données déjà saisies ; rien n’entre sans validation. */
const taxSources = [
    'Salaires',
    'Placements et dividendes',
    'Immeubles',
    'Dettes et intérêts',
    '3e pilier a',
    'Primes d’assurance',
    'Frais médicaux et remboursements',
    'Frais de garde',
    'Dons',
    'Formation',
    'Trajets domicile-travail',
    'Pensions versées'
];

const taxExports = [
    { label: 'Récapitulatif PDF', value: 'Dans l’ordre du formulaire, à recopier' },
    { label: 'Justificatifs (ZIP)', value: 'Pièces numérotées, avec un sommaire' },
    { label: 'Tableur (CSV)', value: 'Un montant par ligne' },
    { label: 'Données (JSON)', value: 'Sauvegarde complète du dossier' }
];

/** Les limites, dites clairement : c’est un brouillon de travail. */
const taxLimits = [
    {
        title: 'Aucun impôt calculé',
        text: 'Spend.Up additionne vos montants et les compare à la décision reçue. Le calcul reste celui du canton.'
    },
    { title: 'Rien n’est transmis', text: 'Aucun envoi à l’administration : vous recopiez vous-même dans le logiciel officiel.' },
    {
        title: 'Rien sans votre accord',
        text: 'Une proposition ne compte qu’une fois acceptée, et une dépense qu’une fois sa nature confirmée.'
    }
];

/** Ce que recouvre l’hébergement : faits vérifiables, sans répéter le mot « Suisse ». */
const swissFacts = [
    { label: 'Ce qui est hébergé', value: 'Comptes, transactions, documents et sauvegardes' },
    { label: 'L’hébergeur', value: 'Infomaniak, indépendant, fondé à Genève en 1994' },
    { label: 'Le cadre légal', value: 'Loi fédérale sur la protection des données (nLPD)' },
    { label: 'À l’étranger', value: 'Aucune copie, aucun cloud tiers' }
];

/** Sans connexion bancaire : la contrainte présentée comme un choix. */
const trustFacts = [
    { title: 'Aucun identifiant bancaire', text: 'Spend.Up ne peut ni consulter ni déplacer votre argent.' },
    { title: 'Vous choisissez ce qui entre', text: 'Rien n’arrive dans votre espace sans votre import.' },
    { title: 'Toutes les banques', text: 'Un export CSV ou Excel suffit, sans partenariat à attendre.' },
    { title: '2FA incluse', text: 'Double authentification et gestion des appareils pour chaque compte.' }
];

/** Chiffrement : les trois couches décrites dans la cartographie du chiffrement de l’API. */
const encryptionLayers = [
    {
        where: 'Sur votre appareil',
        title: 'Données sensibles chiffrées',
        text: showPricing
            ? 'IBAN, numéros de compte et immatriculations, puis notes et documents PDF selon votre offre : chiffrés en AES-256 dans votre navigateur, avant tout envoi. La clé est dérivée de votre mot de passe et nos serveurs ne la reçoivent jamais en clair.'
            : 'IBAN, numéros de compte, immatriculations et autres données sensibles : chiffrés en AES-256 dans votre navigateur, avant tout envoi. La clé est dérivée de votre mot de passe et nos serveurs ne la reçoivent jamais en clair.'
    },
    {
        where: 'Entre vous et nous',
        title: 'Connexion chiffrée',
        text: 'Tous les échanges avec nos serveurs passent par une connexion HTTPS chiffrée. Vos données sensibles, déjà chiffrées sur votre appareil, voyagent ainsi sous deux couches de protection.'
    },
    {
        where: 'Sur nos serveurs',
        title: 'Base de données chiffrée',
        text: 'L’ensemble de la base est chiffré au repos, sur le disque, dans les centres de données d’Infomaniak en Suisse. Un disque copié ou dérobé resterait illisible.'
    },
    {
        where: 'Dans les sauvegardes',
        title: 'Sauvegardes chiffrées',
        text: 'Chaque sauvegarde est chiffrée avant d’être stockée. Vos données sensibles y sont copiées telles quelles, toujours chiffrées avec votre clé.'
    }
];

const platforms = [
    { label: 'Navigateur', value: 'Chrome, Edge, Firefox, Safari' },
    { label: 'Smartphone', value: 'iPhone et Android, depuis le navigateur' },
    { label: 'Ordinateur', value: 'Application Windows 10/11 · 64 bits' }
];

const demoPoints = [
    { title: 'Un foyer déjà rempli', text: 'Sacha a des comptes, des transactions, des amis et un patrimoine.' },
    { title: 'Vous pouvez modifier', text: 'Ajoutez une dépense, un budget ou un fichier : trois PDF au maximum.' },
    {
        title: 'Importez votre relevé',
        text: 'Un CSV de votre banque, ou notre relevé d’exemple. Le fichier est lu dans votre navigateur et n’est jamais envoyé à nos serveurs.'
    },
    { title: 'Rien n’est conservé', text: 'Rechargez la page ou réinitialisez pour retrouver l’exemple de départ.' }
];
</script>

<template>
    <div class="home-page">
        <!-- Hero : la promesse, un appel à l’action, le produit réel -->
        <section class="home-hero">
            <div class="s-container">
                <div class="s-grid home-hero__grid">
                    <div class="home-hero__copy">
                        <h1 class="s-display su-hero-in">
                            La future plateforme de gestion&nbsp;financière
                            <span class="s-primary">100&#8239;%&nbsp;Suisse.<SwissFlag class="home-hero__flag" /></span>
                        </h1>
                        <p class="s-lead su-hero-in" style="--su-in-delay: 120ms">
                            Spend.Up centralise toute votre vie financière au même endroit : comptes, budgets, objectifs et patrimoine. Sans
                            jamais accéder à vos comptes bancaires.
                        </p>
                        <div class="s-actions su-hero-in" style="--su-in-delay: 180ms">
                            <v-btn color="primary" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <v-btn variant="outlined" size="x-large" flat class="text-none" to="/demo">Essayer la démo</v-btn>
                            <RouterLink to="/fonctionnalites" class="home-link">Voir les fonctionnalités</RouterLink>
                        </div>
                        <p class="home-hero__note su-hero-in" style="--su-in-delay: 240ms">
                            Sans connexion bancaire · Web, smartphone et Windows
                        </p>
                    </div>

                    <div class="home-hero__visual su-hero-visual-in" style="--su-in-delay: 160ms">
                        <!-- Mobile : la capture smartphone seule, lisible (même fichier que le téléphone, déjà en cache) -->
                        <picture>
                            <source media="(max-width: 599px)" :srcset="`${SHOTS}/mobile-dashboard.webp`" width="780" height="1688" />
                            <img
                                class="home-hero__desktop"
                                :src="`${SHOTS}/dashboard.webp`"
                                alt="Tableau de bord Spend.Up : solde visible, revenus et dépenses du mois, dépenses par catégorie et comptes"
                                width="2160"
                                height="1350"
                                fetchpriority="high"
                            />
                        </picture>
                        <img
                            class="home-hero__phone"
                            :src="`${SHOTS}/mobile-dashboard.webp`"
                            alt="Le même tableau de bord sur smartphone"
                            width="780"
                            height="1688"
                        />
                    </div>
                </div>
            </div>
        </section>

        <!-- 01 : tout est en Suisse — l’argument mis en avant en premier -->
        <section id="hebergement" class="s-section home-swiss">
            <div class="s-container">
                <div v-reveal class="s-grid swiss">
                    <div class="swiss__intro">
                        <span class="s-kicker"><b>01</b> Hébergement</span>
                        <h2 class="s-h2">Vos données restent en Suisse, <span class="s-primary">chez Infomaniak.</span></h2>
                        <p>Absolument tout, sans exception.</p>
                        <div class="swiss__brand">
                            <SwissFlag class="swiss__flag" />
                            <img :src="infomaniakLogo" alt="Infomaniak" width="244" height="32" />
                            <a href="https://www.infomaniak.com" target="_blank" rel="noopener noreferrer" class="home-link">
                                infomaniak.com <ExternalLinkIcon size="14" />
                            </a>
                        </div>
                    </div>

                    <ul class="swiss__facts">
                        <li v-for="fact in swissFacts" :key="fact.label">
                            <div>
                                <span>{{ fact.label }}</span>
                                <strong>{{ fact.value }}</strong>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- 02 : données sensibles chiffrées dans le navigateur (Coffre) -->
        <section id="chiffrement" class="s-section home-encryption">
            <div class="s-container">
                <div v-reveal class="s-grid encryption">
                    <div class="encryption__intro">
                        <span class="s-kicker"><b>02</b> Chiffrement</span>
                        <h2 class="s-h2">Vos données sensibles, <span class="s-primary">illisibles même pour nous.</span></h2>
                        <p>
                            Vos informations les plus sensibles sont chiffrées dans votre navigateur, avec une clé que nos serveurs ne
                            possèdent pas. Personne d’autre que vous ne peut les lire, pas même un administrateur.
                        </p>
                        <RouterLink to="/protection-des-donnees" class="home-link">
                            Tout savoir sur la protection des données <ArrowRightIcon size="14" />
                        </RouterLink>
                    </div>

                    <ol class="encryption__layers">
                        <li v-for="layer in encryptionLayers" :key="layer.where">
                            <LockIcon size="20" stroke-width="1.8" class="encryption__icon" />
                            <span>{{ layer.where }}</span>
                            <h3>{{ layer.title }}</h3>
                            <p>{{ layer.text }}</p>
                        </li>
                    </ol>
                </div>
            </div>
        </section>

        <!-- 03 : ce que vous en tirez, trois captures smartphone -->
        <section id="benefices" class="s-section home-benefits">
            <div class="s-container">
                <header v-reveal class="home-head">
                    <span class="s-kicker"><b>03</b> Ce que vous en tirez</span>
                    <h2 class="s-h2">Une vue claire, aujourd’hui et pour la suite.</h2>
                </header>

                <ol v-reveal class="benefits" data-reveal-stagger="100">
                    <li v-for="(benefit, index) in benefits" :key="benefit.title">
                        <span class="benefits__index">{{ String(index + 1).padStart(2, '0') }}</span>
                        <h3>{{ benefit.title }}</h3>
                        <p>{{ benefit.text }}</p>
                        <img :src="`${SHOTS}/${benefit.shot}`" :alt="benefit.alt" width="780" height="1688" loading="lazy" />
                    </li>
                </ol>
            </div>
        </section>

        <!-- 04 : trois étapes, une ligne chacune -->
        <section id="comment-ca-marche" class="s-section home-steps">
            <div class="s-container">
                <div class="s-grid how">
                    <div v-reveal class="how__intro">
                        <span class="s-kicker"><b>04</b> Comment ça marche</span>
                        <h2 class="s-h2">Prêt en trois étapes.</h2>
                        <p>
                            Aucune connexion bancaire à configurer, aucun partenariat à attendre : les fichiers de votre e-banking
                            suffisent.
                        </p>
                    </div>

                    <ol v-reveal class="steps" data-reveal-stagger="100">
                        <li v-for="(step, index) in steps" :key="step.title">
                            <span class="steps__number">{{ index + 1 }}</span>
                            <h3>{{ step.title }}</h3>
                            <p>{{ step.text }}</p>
                        </li>
                    </ol>
                </div>
            </div>
        </section>

        <!-- 05 : impôts — le parcours d’un dossier, ce qui est proposé, ce qui sort, et les limites -->
        <section id="impots" class="s-section home-tax">
            <div class="s-container">
                <header v-reveal class="home-head home-head--lead">
                    <span class="s-kicker"><b>05</b> Impôts</span>
                    <h2 class="s-h2">Votre déclaration d’impôts, <span class="s-primary">préparée toute l’année.</span></h2>
                    <p>
                        Ce que vous suivez déjà dans Spend.Up devient un brouillon de déclaration, par année et pour les 26 cantons. Vous
                        validez chaque montant, puis vous le recopiez dans le logiciel officiel.
                    </p>
                </header>

                <ol v-reveal class="tax-phases" data-reveal-stagger="100">
                    <li v-for="(phase, index) in taxPhases" :key="phase.title">
                        <span class="tax-phases__number">{{ index + 1 }}</span>
                        <h3>{{ phase.title }}</h3>
                        <p>{{ phase.text }}</p>
                    </li>
                </ol>

                <div v-reveal class="tax-status">
                    <span class="tax-status__label">Le statut de chaque dossier</span>
                    <ol>
                        <li v-for="status in taxStatuses" :key="status">{{ status }}</li>
                    </ol>
                </div>

                <div v-reveal class="s-grid tax-detail">
                    <div class="tax-detail__sources">
                        <h3>Proposé à partir de vos données</h3>
                        <p>
                            Vos opérations, vos assurances et votre patrimoine alimentent des propositions, ligne par ligne. Les pièces déjà
                            jointes à une transaction se rangent d’un geste sur la bonne ligne.
                        </p>
                        <ul>
                            <li v-for="source in taxSources" :key="source">{{ source }}</li>
                        </ul>
                    </div>

                    <div class="tax-detail__exports">
                        <h3>Ce que vous emportez</h3>
                        <dl>
                            <div v-for="item in taxExports" :key="item.label">
                                <dt>{{ item.label }}</dt>
                                <dd>{{ item.value }}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div v-reveal class="s-grid tax-note">
                    <div class="tax-note__copy">
                        <h3>Un brouillon de travail, pas un logiciel officiel.</h3>
                        <div class="s-actions">
                            <v-btn color="white" size="large" flat class="text-none" to="/demo/analyses/impots">
                                Essayer dans la démo
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink to="/fonctionnalites#impots" class="tax-note__link">Voir le détail</RouterLink>
                        </div>
                    </div>
                    <ul class="tax-note__limits">
                        <li v-for="limit in taxLimits" :key="limit.title">
                            <h4>{{ limit.title }}</h4>
                            <p>{{ limit.text }}</p>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- 06 : sans connexion bancaire -->
        <section id="sans-connexion-bancaire" class="s-section home-trust">
            <div class="s-container">
                <div v-reveal class="s-grid trust">
                    <div class="trust__statement">
                        <span class="s-kicker"><b>06</b> Sans connexion bancaire</span>
                        <h2 class="s-h2">Spend.Up ne se connecte pas à votre banque. <span>Et c’est voulu.</span></h2>
                    </div>

                    <ul class="trust__facts">
                        <li v-for="fact in trustFacts" :key="fact.title">
                            <h3>{{ fact.title }}</h3>
                            <p>{{ fact.text }}</p>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- 07 : disponible partout, dont l’application de bureau -->
        <section id="applications" class="s-section home-anywhere">
            <div class="s-container">
                <div v-reveal class="s-grid anywhere">
                    <div class="anywhere__copy">
                        <span class="s-kicker"><b>07</b> Disponible partout</span>
                        <h2 class="s-h2">Sur le web, sur smartphone et sur votre ordinateur.</h2>
                        <p>Vos données restent synchronisées d’un appareil à l’autre.</p>
                        <div class="s-actions">
                            <v-btn color="primary" size="large" flat class="text-none" :href="windowsDownloadUrl" download>
                                <BrandWindowsIcon size="18" class="me-2" />
                                Télécharger pour Windows
                            </v-btn>
                            <RouterLink to="/app" class="home-link">Ouvrir l’application web</RouterLink>
                        </div>
                    </div>
                    <dl class="anywhere__platforms">
                        <div v-for="platform in platforms" :key="platform.label">
                            <dt>{{ platform.label }}</dt>
                            <dd>{{ platform.value }}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>

        <!-- 08 : essayer sans créer de compte -->
        <section id="essayer-la-demo" class="s-section home-demo">
            <div class="s-container">
                <div v-reveal class="s-grid demo">
                    <div class="demo__copy">
                        <span class="s-kicker"><b>08</b> Essayer la démo</span>
                        <h2 class="s-h2">Parcourez Spend.Up avant de créer un compte.</h2>
                        <p>
                            Un foyer d’exemple est déjà rempli : comptes, transactions, budgets, récurrences et patrimoine. Vous pouvez y
                            importer votre propre relevé. Rien n’est enregistré sur nos serveurs.
                        </p>
                        <div class="s-actions">
                            <v-btn color="primary" size="x-large" flat class="text-none" to="/demo">
                                Essayer la démo
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                        </div>
                    </div>
                    <ul class="demo__points">
                        <li v-for="point in demoPoints" :key="point.title">
                            <h3>{{ point.title }}</h3>
                            <p>{{ point.text }}</p>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Appel final -->
        <section id="commencer" class="home-final">
            <div class="s-container">
                <div v-reveal class="s-grid home-final__grid">
                    <h2 class="home-final__title s-display">Commencez simplement. <span>Évoluez à votre rythme.</span></h2>
                    <div class="home-final__side">
                        <p>
                            {{
                                showPricing
                                    ? 'Créez votre espace gratuitement, sans engagement.'
                                    : 'Créez votre espace : il ne vous faut qu’une adresse e-mail.'
                            }}
                        </p>
                        <div class="s-actions">
                            <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink v-if="showPricing" to="/tarifs" class="home-final__link">Voir les tarifs</RouterLink>
                        </div>
                        <p class="home-final__meta">Version bêta : les données peuvent être réinitialisées pendant cette phase.</p>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/home-content';
</style>
