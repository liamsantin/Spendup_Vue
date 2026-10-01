<script setup lang="ts">
import {
    ArrowRightIcon,
    BrandWindowsIcon,
    BuildingBankIcon,
    ChartPieIcon,
    HomeEcoIcon,
    UsersIcon,
    CheckIcon,
    DeviceDesktopIcon,
    DownloadIcon,
    FileImportIcon,
    FileSpreadsheetIcon,
    GavelIcon,
    HistoryIcon,
    KeyOffIcon,
    LeafIcon,
    MapPinIcon,
    PaperclipIcon,
    ServerIcon,
    ShieldCheckIcon,
    SparklesIcon,
    UserPlusIcon
} from 'vue-tabler-icons';
import heroVisual from '@/assets/images/front-pages/dashboard-preview.png';
import infomaniakLogo from '@/assets/images/front-pages/infomaniak-logo.svg';
import AnywhereScene from '@/components/frontpages/mockups/scenes/AnywhereScene.vue';
import HubScene from '@/components/frontpages/mockups/scenes/HubScene.vue';
import { spendupDomainNames } from '@/data/front-pages/spendup-additional-domains';

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

/** Pourquoi Spend.Up ne se connecte pas à la banque : la contrainte présentée comme un choix. */
const noBankLinkReasons = [
    {
        icon: KeyOffIcon,
        title: 'Aucun accès à vos comptes',
        text: 'Spend.Up ne vous demande jamais vos identifiants e-banking et ne peut ni consulter ni déplacer votre argent.'
    },
    {
        icon: FileImportIcon,
        title: 'Vous choisissez ce qui entre',
        text: 'Vous importez les relevés que vous voulez, quand vous le voulez. Rien n’arrive dans votre espace sans votre accord.'
    },
    {
        icon: BuildingBankIcon,
        title: 'Toutes les banques, sans partenariat',
        text: 'Si votre banque permet d’exporter vos relevés en CSV ou en Excel, elle est compatible. Aucune intégration à attendre.'
    },
    {
        icon: FileSpreadsheetIcon,
        title: 'Un import qui apprend',
        text: 'Spend.Up reconnaît les colonnes de votre fichier, vous laisse relire chaque ligne avant de valider et mémorise le modèle.'
    },
    {
        icon: PaperclipIcon,
        title: 'Les justificatifs à côté des chiffres',
        text: 'Factures, reçus et contrats en PDF se joignent à vos opérations : la preuve reste à portée de main.'
    },
    {
        icon: HistoryIcon,
        title: 'Un historique qui vous appartient',
        text: 'Année après année, votre carnet de bord s’enrichit. Il reste exportable et ne dépend d’aucune banque.'
    }
];

const hostingFacts = [
    {
        icon: ServerIcon,
        title: 'Des serveurs en Suisse',
        text: 'Vos comptes, transactions et documents sont stockés dans des centres de données situés en Suisse, pas sur des serveurs à l’étranger.'
    },
    {
        icon: GavelIcon,
        title: 'Protégées par le droit suisse',
        text: 'Vos données relèvent de la loi fédérale sur la protection des données (nLPD), l’un des cadres les plus exigeants au monde.'
    },
    {
        icon: ShieldCheckIcon,
        title: 'Un hébergeur suisse indépendant',
        text: 'Infomaniak est une entreprise suisse fondée à Genève en 1994, indépendante des géants du cloud étrangers.'
    },
    {
        icon: LeafIcon,
        title: 'Une infrastructure responsable',
        text: 'Des centres de données alimentés en énergie renouvelable, dont la chaleur est valorisée plutôt que perdue.'
    }
];

const hostingScope = ['Base de données', 'Documents & justificatifs', 'Sauvegardes'];

const pillars = [
    {
        icon: BuildingBankIcon,
        label: 'Comptes & transactions',
        text: 'Banques, cash, cartes et wallets réunis à partir de vos imports et de vos saisies, avec catégorisation automatique.'
    },
    {
        icon: ChartPieIcon,
        label: 'Budgets & objectifs',
        text: 'Des limites claires, des projets suivis pas à pas et des alertes avant le dépassement.'
    },
    {
        icon: HomeEcoIcon,
        label: 'Patrimoine & placements',
        text: 'Immobilier, véhicules, investissements et crypto réunis dans un patrimoine net vivant.'
    },
    {
        icon: UsersIcon,
        label: 'Famille & partage',
        text: 'Un espace commun, des rôles précis et des dépenses réparties sans mélanger vos comptes.'
    }
];

const steps = [
    {
        icon: UserPlusIcon,
        title: 'Créez votre espace',
        text: 'Une adresse e-mail suffit. Aucune carte bancaire, aucun engagement : votre espace est prêt en moins d’une minute.',
        meta: 'Moins d’une minute'
    },
    {
        icon: FileImportIcon,
        title: 'Importez vos relevés',
        text: 'Exportez vos relevés depuis votre e-banking et déposez-les dans Spend.Up. Il reconnaît les colonnes, vous relisez, vous validez.',
        meta: 'CSV & Excel'
    },
    {
        icon: ChartPieIcon,
        title: 'Organisez, décidez',
        text: 'Catégories, tiers et justificatifs PDF se mettent en place. Budgets, objectifs et alertes transforment ensuite vos chiffres en décisions.',
        meta: 'Justificatifs PDF liés'
    }
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

/** FAQ en deux colonnes : chaque colonne est un accordéon indépendant. */
const faqColumns = [faqs.slice(0, Math.ceil(faqs.length / 2)), faqs.slice(Math.ceil(faqs.length / 2))];
</script>

<template>
    <div class="home-page">
        <section class="home-hero">
            <v-container class="max-width-1218">
                <v-row align="center">
                    <v-col cols="12" lg="6" class="home-hero__copy">
                        <v-chip color="primary" variant="tonal" rounded="pill" class="home-eyebrow su-hero-in">
                            <KeyOffIcon size="15" class="me-2" />
                            Sans connexion bancaire, par choix
                        </v-chip>

                        <h1 class="home-title textPrimary su-hero-in" style="--su-in-delay: 80ms">
                            Votre carnet de bord financier,
                            <span>alimenté par vos relevés.</span>
                        </h1>

                        <p class="home-subtitle text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                            Importez les relevés de votre banque, joignez vos justificatifs : Spend.Up classe, relie et transforme votre
                            historique en budgets, objectifs et décisions. Sans jamais accéder à vos comptes.
                        </p>

                        <div class="home-hero__actions su-hero-in" style="--su-in-delay: 240ms">
                            <v-btn color="primary" size="x-large" flat class="text-none px-7" to="/auth?tab=register">
                                Commencer gratuitement
                                <ArrowRightIcon size="19" class="ms-2" />
                            </v-btn>
                            <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-7" to="/fonctionnalites">
                                Découvrir Spend.Up
                            </v-btn>
                        </div>

                        <div class="home-hero__reassurance su-hero-in" style="--su-in-delay: 320ms">
                            <span><CheckIcon size="16" /> Aucun identifiant bancaire</span>
                            <span><CheckIcon size="16" /> Gratuit pour commencer</span>
                            <span><CheckIcon size="16" /> Données en Suisse</span>
                        </div>
                    </v-col>

                    <v-col cols="12" lg="6" class="mt-12 mt-lg-0">
                        <div class="hero-product su-hero-visual-in">
                            <div class="hero-product__glow"></div>
                            <div class="hero-product__window">
                                <div class="hero-product__bar">
                                    <span></span><span></span><span></span>
                                    <div class="hero-product__label">Tableau de bord Spend.Up</div>
                                </div>
                                <img
                                    :src="heroVisual"
                                    alt="Aperçu du tableau de bord Spend.Up"
                                    class="hero-product__image"
                                    width="1024"
                                    height="505"
                                />
                            </div>
                            <div class="hero-float hero-float--security su-float-soft">
                                <ShieldCheckIcon size="21" />
                                <div><strong>100 % Suisse</strong><small>Vos données sont protégées</small></div>
                            </div>
                            <div class="hero-float hero-float--overview su-float-soft" style="--su-float-delay: 1.4s">
                                <FileImportIcon size="21" />
                                <div><strong>Relevé importé</strong><small>CSV, Excel &amp; justificatifs PDF</small></div>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-container>
        </section>

        <section class="trust-strip">
            <v-container class="max-width-1218">
                <div v-reveal class="trust-strip__grid" data-reveal-stagger="70">
                    <div>
                        <strong>{{ spendupDomainNames.length }}</strong
                        ><span>domaines métiers réunis</span>
                    </div>
                    <div><strong>100 %</strong><span>des données en Suisse</span></div>
                    <div><strong>2FA</strong><span>incluse pour chaque compte</span></div>
                    <div><strong>0</strong><span>accès à vos comptes bancaires</span></div>
                </div>
            </v-container>
        </section>

        <section id="hebergement" class="home-hosting">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Hébergement souverain</span>
                    <h2 class="textPrimary">Vos données restent en Suisse,<br /><span>chez Infomaniak.</span></h2>
                    <p class="text-medium-emphasis">
                        Spend.Up confie l’hébergement de vos données à Infomaniak, un hébergeur cloud suisse reconnu. Pas de détour par
                        l’étranger : vos finances restent là où vous vivez.
                    </p>
                </div>

                <div v-reveal class="hosting-panel">
                    <div class="hosting-card">
                        <span class="hosting-card__label">Hébergé par</span>
                        <img :src="infomaniakLogo" alt="Infomaniak" class="hosting-card__logo" width="244" height="32" />
                        <div class="hosting-card__place">
                            <svg viewBox="0 0 32 32" aria-hidden="true">
                                <rect width="32" height="32" rx="7" fill="#DA291C" />
                                <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                                <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                            </svg>
                            <div>
                                <strong>Centres de données en Suisse</strong>
                                <small><MapPinIcon size="13" /> Genève, Suisse</small>
                            </div>
                        </div>
                        <ul class="hosting-card__scope" aria-label="Données hébergées en Suisse">
                            <li v-for="item in hostingScope" :key="item"><CheckIcon size="14" stroke-width="2.4" />{{ item }}</li>
                        </ul>
                    </div>

                    <ul v-reveal class="hosting-facts" data-reveal-stagger="90">
                        <li v-for="fact in hostingFacts" :key="fact.title" class="hosting-fact">
                            <span class="hosting-fact__icon">
                                <component :is="fact.icon" size="21" stroke-width="1.65" />
                            </span>
                            <h3 class="textPrimary">{{ fact.title }}</h3>
                            <p class="text-medium-emphasis">{{ fact.text }}</p>
                        </li>
                    </ul>
                </div>
            </v-container>
        </section>

        <section id="comment-ca-marche" class="home-steps">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Comment ça marche</span>
                    <h2 class="textPrimary">Trois étapes pour y voir clair</h2>
                    <p class="text-medium-emphasis">
                        Pas de connexion bancaire à configurer, pas de paramétrage interminable : un relevé exporté depuis votre e-banking
                        suffit pour démarrer.
                    </p>
                </div>

                <ol v-reveal class="steps-grid" data-reveal-stagger="120">
                    <li v-for="(step, index) in steps" :key="step.title" class="step-card">
                        <div class="step-card__head">
                            <span class="step-card__index">0{{ index + 1 }}</span>
                            <div class="step-card__icon">
                                <component :is="step.icon" size="23" stroke-width="1.6" />
                            </div>
                        </div>
                        <h3 class="textPrimary">{{ step.title }}</h3>
                        <p class="text-medium-emphasis">{{ step.text }}</p>
                        <span class="step-card__meta">{{ step.meta }}</span>
                    </li>
                </ol>
            </v-container>
        </section>

        <section id="sans-connexion-bancaire" class="home-features">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Sans connexion bancaire</span>
                    <h2 class="textPrimary">Spend.Up ne se connecte pas à votre banque.<br /><span>Et c’est voulu.</span></h2>
                    <p class="text-medium-emphasis">
                        Pas d’identifiants à confier, pas d’accès permanent à vos comptes. Vous gardez la main sur ce qui entre dans votre
                        espace, Spend.Up se charge de le rendre lisible.
                    </p>
                </div>

                <ul v-reveal class="feature-grid" data-reveal-stagger="80">
                    <li v-for="reason in noBankLinkReasons" :key="reason.title" class="feature-card">
                        <div class="feature-card__icon">
                            <component :is="reason.icon" size="23" stroke-width="1.65" />
                        </div>
                        <h3 class="textPrimary">{{ reason.title }}</h3>
                        <p class="text-medium-emphasis">{{ reason.text }}</p>
                    </li>
                </ul>

                <p v-reveal class="home-features__note text-medium-emphasis">
                    Vos soldes sont à jour de votre dernier import : importez chaque semaine ou chaque mois, à votre rythme.
                </p>
            </v-container>
        </section>

        <section id="plateforme" class="home-platform">
            <div class="home-platform__backdrop" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div v-reveal class="platform-layout">
                    <div class="platform-visual">
                        <HubScene />
                    </div>

                    <div class="platform-copy">
                        <span class="section-kicker">Une seule plateforme</span>
                        <h2 class="textPrimary">
                            <span class="platform-count">{{ spendupDomainNames.length }}</span> domaines métiers.<br />Une seule vision, la
                            vôtre.
                        </h2>
                        <p class="platform-copy__lead text-medium-emphasis">
                            Fini les fichiers dispersés et les applications qui ne se parlent pas. Chaque relevé importé, chaque
                            justificatif joint enrichit le même historique : du compte courant au patrimoine familial, tout est relié pour
                            vous donner une lecture claire et complète de votre situation.
                        </p>

                        <ul class="platform-pillars">
                            <li v-for="pillar in pillars" :key="pillar.label">
                                <span class="platform-pillars__icon">
                                    <component :is="pillar.icon" size="21" stroke-width="1.65" />
                                </span>
                                <div>
                                    <strong>{{ pillar.label }}</strong>
                                    <p>{{ pillar.text }}</p>
                                </div>
                            </li>
                        </ul>

                        <ul class="platform-domains" :aria-label="`Les ${spendupDomainNames.length} domaines métiers`">
                            <li v-for="name in spendupDomainNames" :key="name">{{ name }}</li>
                        </ul>

                        <div class="platform-copy__actions">
                            <v-btn color="primary" size="large" flat class="text-none px-6" to="/fonctionnalites">
                                Découvrir toutes les fonctionnalités
                                <ArrowRightIcon size="18" class="ms-2" />
                            </v-btn>
                            <span>Gratuit pour commencer · Sans carte bancaire</span>
                        </div>
                    </div>
                </div>
            </v-container>
        </section>

        <section class="home-anywhere">
            <v-container class="max-width-1218">
                <div v-reveal class="anywhere-panel">
                    <div class="anywhere-panel__copy">
                        <div class="feature-card__icon">
                            <DeviceDesktopIcon size="25" stroke-width="1.65" />
                        </div>
                        <span class="section-kicker">Disponible partout</span>
                        <h2 class="textPrimary">Votre espace financier vous suit, pas l’inverse.</h2>
                        <p class="text-medium-emphasis">
                            Consultez Spend.Up depuis votre navigateur ou installez l’application Windows : votre carnet de bord et vos
                            justificatifs vous attendent sur chaque appareil.
                        </p>
                        <div class="anywhere-panel__actions">
                            <v-btn color="primary" size="large" flat class="text-none" :href="windowsDownloadUrl" download>
                                <BrandWindowsIcon size="19" class="me-2" />
                                Télécharger pour Windows
                            </v-btn>
                            <span><DownloadIcon size="15" /> Windows 10/11 · 64 bits</span>
                        </div>
                    </div>

                    <div class="anywhere-panel__devices">
                        <AnywhereScene />
                    </div>
                </div>
            </v-container>
        </section>

        <section id="questions" class="home-faq">
            <v-container class="max-width-1218">
                <div v-reveal class="section-heading">
                    <span class="section-kicker">Questions fréquentes</span>
                    <h2 class="textPrimary">Tout ce qu’il faut savoir avant de commencer</h2>
                </div>
                <div v-reveal class="faq-columns">
                    <v-expansion-panels v-for="(column, index) in faqColumns" :key="index" class="faq-list" elevation="0">
                        <v-expansion-panel v-for="faq in column" :key="faq.question" class="faq-item" elevation="0">
                            <v-expansion-panel-title>{{ faq.question }}</v-expansion-panel-title>
                            <v-expansion-panel-text>{{ faq.answer }}</v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </div>
            </v-container>
        </section>

        <section id="commencer" class="home-final-cta">
            <div class="home-final-cta__ring home-final-cta__ring--one" aria-hidden="true"></div>
            <div class="home-final-cta__ring home-final-cta__ring--two" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div v-reveal class="final-cta">
                    <span class="section-kicker">Votre prochaine bonne décision financière</span>
                    <h2 class="textPrimary">Commencez simplement.<br /><span>Évoluez à votre rythme.</span></h2>
                    <p class="text-medium-emphasis">Créez votre espace gratuitement, sans carte bancaire et sans engagement.</p>
                    <div class="home-final-cta__actions">
                        <v-btn color="primary" size="x-large" flat class="text-none px-8" to="/auth?tab=register">
                            Commencer gratuitement
                            <ArrowRightIcon size="19" class="ms-2" />
                        </v-btn>
                        <v-btn color="primary" size="x-large" variant="outlined" class="text-none px-8" to="/tarifs">Voir les tarifs</v-btn>
                    </div>
                    <div class="final-cta__reassurance">
                        <span><CheckIcon size="16" /> Sans carte bancaire</span>
                        <span><CheckIcon size="16" /> Sans engagement</span>
                        <span><CheckIcon size="16" /> Données en Suisse</span>
                    </div>
                    <p class="final-cta__beta">
                        <SparklesIcon size="15" />
                        Spend.Up est en version bêta : les données peuvent être réinitialisées sans préavis pendant cette phase.
                    </p>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/home-content';
</style>
