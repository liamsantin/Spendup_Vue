<script setup lang="ts">
import { ArrowRightIcon, BrandWindowsIcon, ExternalLinkIcon, LockIcon } from 'vue-tabler-icons';
import infomaniakLogo from '@/assets/images/front-pages/infomaniak-logo.svg';
import { APP_SCREENSHOTS_PATH as SHOTS } from '@/data/front-pages/spendup-additional-domains';

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
    { title: 'Créez votre espace', text: 'Une adresse e-mail suffit, c’est gratuit.' },
    { title: 'Importez vos relevés', text: 'Un export CSV ou Excel depuis votre e-banking.' },
    { title: 'Pilotez', text: 'Budgets, objectifs et échéances, au même endroit.' }
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
        text: 'IBAN, numéros de compte, immatriculations : chiffrés avant d’être envoyés, avec une clé issue de votre mot de passe.'
    },
    {
        where: 'Sur nos serveurs',
        title: 'Base de données chiffrée',
        text: 'L’ensemble de la base est chiffré au repos, sur le disque.'
    },
    {
        where: 'Dans les sauvegardes',
        title: 'Sauvegardes chiffrées',
        text: 'Chaque sauvegarde est chiffrée avant d’être stockée.'
    }
];

const platforms = [
    { label: 'Navigateur', value: 'Chrome, Edge, Firefox, Safari' },
    { label: 'Smartphone', value: 'iPhone et Android, depuis le navigateur' },
    { label: 'Ordinateur', value: 'Application Windows 10/11 · 64 bits' }
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
                            La plateforme de gestion&nbsp;financière <span class="s-primary">100&#8239;%&nbsp;suisse.</span>
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
            <svg class="home-swiss__flag" viewBox="0 0 32 32" role="img" aria-label="Drapeau suisse">
                <rect width="32" height="32" fill="#E4002B" />
                <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
            </svg>
            <div class="s-container">
                <div v-reveal class="s-grid swiss">
                    <div class="swiss__intro">
                        <span class="s-kicker"><b>01</b> Hébergement</span>
                        <h2 class="s-h2">Vos données restent en Suisse, <span class="s-primary">chez Infomaniak.</span></h2>
                        <p>Absolument tout, sans exception.</p>
                        <div class="swiss__brand">
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
                <header v-reveal class="home-head">
                    <span class="s-kicker"><b>04</b> Comment ça marche</span>
                    <h2 class="s-h2">Prêt en trois étapes.</h2>
                </header>

                <ol v-reveal class="steps" data-reveal-stagger="100">
                    <li v-for="(step, index) in steps" :key="step.title">
                        <span class="steps__number">{{ index + 1 }}</span>
                        <h3>{{ step.title }}</h3>
                        <p>{{ step.text }}</p>
                    </li>
                </ol>
            </div>
        </section>

        <!-- 05 : sans connexion bancaire -->
        <section id="sans-connexion-bancaire" class="s-section home-trust">
            <div class="s-container">
                <div v-reveal class="s-grid trust">
                    <div class="trust__statement">
                        <span class="s-kicker"><b>05</b> Sans connexion bancaire</span>
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

        <!-- 06 : disponible partout, dont l’application de bureau -->
        <section id="applications" class="s-section home-anywhere">
            <div class="s-container">
                <div v-reveal class="s-grid anywhere">
                    <div class="anywhere__copy">
                        <span class="s-kicker"><b>06</b> Disponible partout</span>
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

        <!-- Appel final -->
        <section id="commencer" class="home-final">
            <div class="s-container">
                <div v-reveal class="s-grid home-final__grid">
                    <h2 class="home-final__title s-display">Commencez simplement. <span>Évoluez à votre rythme.</span></h2>
                    <div class="home-final__side">
                        <p>Créez votre espace gratuitement, sans engagement.</p>
                        <div class="s-actions">
                            <v-btn color="white" size="x-large" flat class="text-none" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="18" class="ms-3" />
                            </v-btn>
                            <RouterLink to="/tarifs" class="home-final__link">Voir les tarifs</RouterLink>
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
