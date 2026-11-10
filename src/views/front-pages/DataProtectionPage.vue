<script setup lang="ts">
/**
 * Page publique « Protection des données » (`/protection-des-donnees`).
 * Les affirmations sur le chiffrement suivent la grille « Communication » du document de suivi
 * de la confidentialité (kDrive, feature-data-confidentiality.md §9) : ne rien promettre de plus.
 */
import { LockIcon, MapPinIcon, ScaleIcon, ShieldLockIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import LegalToc from '@/components/frontpages/legal/LegalToc.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

const showPricing = isPricingPageEnabled();
</script>

<template>
    <div class="front-wraper legal-page">
        <AnnounceBar />
        <Header />

        <section class="legal-hero">
            <v-container class="max-width-1218">
                <div class="legal-hero__icon"><LockIcon size="30" stroke-width="1.5" /></div>
                <span class="legal-kicker">Vos données, vos droits</span>
                <h1 class="textPrimary">Protection des données</h1>
                <p class="text-medium-emphasis">
                    Ce que Spend.Up conserve, où vos données sont hébergées, comment elles sont chiffrées et ce que vous pouvez en faire.
                </p>
                <div class="legal-hero__meta">
                    <span><MapPinIcon size="16" /> Hébergé en Suisse</span>
                    <span><ShieldLockIcon size="16" /> Chiffré dans votre navigateur</span>
                    <span><ScaleIcon size="16" /> Loi suisse (nLPD)</span>
                </div>
            </v-container>
        </section>

        <main class="legal-main">
            <v-container class="max-width-1218 data-protection-body">
                <LegalToc />
                <div class="legal-intro">
                    <strong>En bref</strong>
                    <p>
                        Spend.Up ne se connecte jamais à votre banque et ne vend jamais vos données. Elles sont hébergées en Suisse, chez
                        Infomaniak, et chiffrées sur nos serveurs. Vos informations les plus sensibles sont en plus chiffrées dans votre
                        navigateur : personne d’autre que vous ne peut les lire, pas même nous.
                    </p>
                </div>

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">1. Responsable du traitement</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Le responsable du traitement est l’entité qui exploite la plateforme Spend.Up. Cette page explique comment vos
                        données personnelles sont collectées, utilisées, protégées et conservées.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Nous traitons vos données conformément à la loi fédérale sur la protection des données (nLPD) et, lorsqu’il
                        s’applique, au Règlement général sur la protection des données (RGPD). Pour toute question, écrivez-nous depuis la
                        page <RouterLink to="/contact">Contact</RouterLink>.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">2. Données traitées</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Spend.Up n’a aucun accès à vos comptes bancaires. Tout ce qui se trouve dans votre espace, vous l’avez saisi ou
                        importé vous-même.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Votre compte</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Nom, prénom, nom d’utilisateur et adresse e-mail</li>
                        <li class="mb-2">Photo de profil, si vous en ajoutez une</li>
                        <li class="mb-2">Préférences d’affichage, de langue et de notifications</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Votre authentification</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Mot de passe, conservé uniquement sous forme hachée</li>
                        <li class="mb-2">Réglages de la vérification en deux étapes</li>
                        <li class="mb-2">Sessions actives et appareils connectés</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Vos finances</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Comptes, transactions, catégories, étiquettes et budgets</li>
                        <li class="mb-2">Paiements récurrents, abonnements et objectifs d’épargne</li>
                        <li class="mb-2">Patrimoine : biens immobiliers, véhicules, placements, cryptomonnaies et objets de valeur</li>
                        <li class="mb-2">Dettes, prêts entre particuliers et dépenses partagées</li>
                        <li class="mb-2">Tiers que vous enregistrez, avec leurs coordonnées</li>
                        <li class="mb-2">Documents PDF et relevés que vous importez</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Vos relations dans Spend.Up</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Liste d’amis, demandes envoyées et reçues, utilisateurs bloqués</li>
                        <li class="mb-2">Ressources que vous choisissez de partager, et avec qui</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Données techniques</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">Adresse IP, type d’appareil et de navigateur</li>
                        <li class="mb-2">Dates et heures de connexion</li>
                        <li class="mb-2">Événements de sécurité liés à votre compte</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">3. Hébergement en Suisse</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vos données sont hébergées en Suisse par Infomaniak, un hébergeur indépendant fondé à Genève. Cela concerne :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Le serveur de l’application et sa base de données</li>
                        <li class="mb-2">Vos documents PDF et vos imports</li>
                        <li class="mb-2">Les sauvegardes</li>
                        <li class="mb-2">Les e-mails que nous vous envoyons</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Les fichiers de l’interface du site sont distribués par Render. Votre navigateur les télécharge, puis échange vos
                        données directement avec nos serveurs en Suisse : vos données financières ne transitent pas par Render.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">4. Chiffrement</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Vos données sont protégées par plusieurs couches de chiffrement, de votre appareil jusqu’aux sauvegardes.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Pendant le transfert</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Tous les échanges entre votre appareil et nos serveurs passent par une connexion HTTPS chiffrée.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Sur nos serveurs</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">La base de données est entièrement chiffrée au repos, sur le disque.</li>
                        <li class="mb-2">Vos documents sont stockés dans un espace privé, chiffré au repos par notre hébergeur suisse.</li>
                        <li class="mb-2">
                            Les sauvegardes sont chiffrées chaque nuit, avant de quitter le serveur. Leur clé de déchiffrement est conservée
                            hors du serveur.
                        </li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Ce chiffrement protège vos données si un disque ou une sauvegarde venait à être copié ou dérobé. Comme ses clés sont
                        sur nos serveurs, il ne suffit pas, à lui seul, à rendre vos données illisibles pour nous. C’est le rôle du Coffre.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Dans votre navigateur : le Coffre</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Le Coffre chiffre vos informations les plus sensibles directement dans votre navigateur, avant tout envoi. Il est
                        créé automatiquement à l’inscription, sans réglage à faire.
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Une clé AES-256 est générée sur votre appareil.</li>
                        <li class="mb-2">
                            Cette clé est elle-même protégée par une clé dérivée de votre mot de passe (PBKDF2-SHA-256, 600 000 itérations).
                        </li>
                        <li class="mb-2">
                            Nos serveurs ne conservent qu’une version protégée de la clé, qu’ils ne peuvent pas ouvrir. Ni votre mot de
                            passe ni la clé ne leur parviennent en clair.
                        </li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-2">Le Coffre chiffre, pour tous les comptes :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Les IBAN et numéros de compte</li>
                        <li class="mb-2">Les plaques d’immatriculation et numéros de châssis</li>
                        <li class="mb-2">Les adresses de portefeuilles crypto et les numéros de série</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-2">
                        {{ showPricing ? 'Et en plus, selon votre offre :' : 'Il peut aussi chiffrer, selon votre compte :' }}
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Vos notes et descriptions</li>
                        <li class="mb-2">Les adresses de vos biens immobiliers et le lieu de rangement de vos objets de valeur</li>
                        <li class="mb-2">Les noms et coordonnées de vos tiers, numéros de TVA et IDE compris</li>
                        <li class="mb-2">Vos documents PDF, contenu et nom du fichier</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Les montants, dates, libellés et catégories ne sont pas chiffrés par le Coffre : ils servent aux calculs, aux
                        budgets et aux alertes. Ils restent protégés par le chiffrement de nos serveurs.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Si vous vous connectez uniquement avec Google, le Coffre s’active dès que vous définissez une phrase de Coffre ou un
                        mot de passe, dans Réglages, Sécurité. Les champs du Coffre ne sont jamais partagés avec vos amis.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Code de récupération</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Dans Réglages, Sécurité, vous pouvez générer un code de récupération. Il est affiché une seule fois : conservez-le
                        en lieu sûr. En cas d’oubli du mot de passe, il permet de rouvrir votre Coffre.
                    </p>
                    <AppAlert type="warning" class="text-body-2 mb-0">
                        Sans code de récupération, un mot de passe oublié rend les champs du Coffre définitivement illisibles. Nous ne
                        pouvons pas les récupérer à votre place. Votre compte, vos montants et vos libellés, eux, sont conservés.
                    </AppAlert>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">5. Qui peut accéder à vos données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Personne ne consulte vos données au quotidien. Notre console d’administration n’affiche que des statistiques
                        globales, sans données individuelles.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Un accès technique à votre espace reste exceptionnel, par exemple pour répondre à une demande d’assistance. Il suit
                        une procédure stricte :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Il est limité dans le temps et se fait en lecture seule.</li>
                        <li class="mb-2">Sa raison est enregistrée et chaque action est journalisée.</li>
                        <li class="mb-2">Vous êtes prévenu par e-mail avant que la moindre donnée ne s’affiche.</li>
                        <li class="mb-2">Les champs chiffrés par le Coffre restent illisibles, même pendant cet accès.</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Vous retrouvez chaque accès dans Réglages, Sécurité, Accès techniques. Le registre de transparence, au même endroit,
                        publie aussi les visites de la console d’administration.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">6. Finalités et bases légales</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Vos données servent uniquement à :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Fournir les fonctionnalités de Spend.Up et gérer votre compte</li>
                        <li class="mb-2">Calculer vos soldes, budgets, statistiques et alertes</li>
                        <li class="mb-2">Sécuriser votre compte et prévenir les accès frauduleux</li>
                        <li class="mb-2">Répondre à vos demandes d’assistance</li>
                        <li class="mb-2">Respecter nos obligations légales</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Ces traitements reposent sur l’exécution de notre contrat avec vous, sur nos obligations légales, sur notre intérêt
                        légitime à sécuriser le service et, lorsqu’il est requis, sur votre consentement. Vos données ne sont jamais
                        utilisées à des fins publicitaires.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">7. Partage des données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vos données ne sont ni vendues ni cédées à des fins commerciales. Elles ne sont communiquées qu’aux prestataires
                        strictement nécessaires au service :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Infomaniak, en Suisse : hébergement, stockage des fichiers, sauvegardes et envoi des e-mails</li>
                        <li class="mb-2">Render : distribution des fichiers de l’interface du site</li>
                        <li class="mb-2">
                            Google, uniquement si vous choisissez de vous connecter avec Google : nous recevons alors votre nom, votre
                            adresse e-mail et votre photo de profil
                        </li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Lorsque vous partagez une ressource avec un ami, il voit ce que vous avez choisi de lui montrer. Les champs chiffrés
                        par le Coffre restent masqués pour lui.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">8. Conservation</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vos données sont conservées tant que votre compte existe, puis supprimées. Quelques règles précises s’ajoutent :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">
                            Le fichier et les données brutes d’un import sont supprimés dès que l’import est validé, annulé ou supprimé.
                        </li>
                        <li class="mb-2">Un import jamais validé expire après 30 jours.</li>
                        <li class="mb-2">
                            Les sauvegardes quotidiennes sont gardées 30 jours et les sauvegardes mensuelles 12 mois, puis effacées.
                        </li>
                        <li class="mb-2">
                            Les journaux de sécurité sont conservés pour une durée limitée, le temps nécessaire à la protection des comptes.
                        </li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Spend.Up est en version bêta : pendant cette phase, les données peuvent être réinitialisées.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">9. Cookies et stockage local</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Spend.Up n’utilise aucun cookie publicitaire ni aucun outil de mesure d’audience. Votre navigateur conserve
                        seulement ce qui est nécessaire au fonctionnement :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">Votre session de connexion, effacée à la fermeture de l’onglet</li>
                        <li class="mb-2">Vos préférences d’affichage</li>
                        <li class="mb-2">La clé de votre Coffre, non exportable, effacée à la déconnexion</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">10. Sécurité du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">En plus du chiffrement, votre compte est protégé par :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">La vérification de votre adresse e-mail</li>
                        <li class="mb-2">La vérification en deux étapes, si vous l’activez</li>
                        <li class="mb-2">La détection des tentatives de connexion suspectes</li>
                        <li class="mb-2">La déconnexion automatique après une période d’inactivité</li>
                        <li class="mb-2">La liste de vos sessions actives, que vous pouvez révoquer à tout moment</li>
                    </ul>
                    <AppAlert type="info" class="text-body-2 mb-0">
                        Malgré toutes ces précautions, aucun système informatique ne peut garantir une sécurité absolue.
                    </AppAlert>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">11. Vos droits</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Selon la nLPD et, le cas échéant, le RGPD, vous pouvez :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Obtenir une copie des données qui vous concernent</li>
                        <li class="mb-2">Corriger des informations inexactes, directement dans l’application</li>
                        <li class="mb-2">Recevoir vos données dans un format réutilisable</li>
                        <li class="mb-2">Vous opposer à un traitement ou demander sa limitation</li>
                        <li class="mb-2">Supprimer votre compte et vos données</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Pour exercer ces droits, écrivez-nous depuis la page <RouterLink to="/contact">Contact</RouterLink>. Vous pouvez
                        aussi vous adresser au Préposé fédéral à la protection des données et à la transparence (PFPDT).
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">12. Suppression du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous pouvez supprimer votre compte vous-même, dans Réglages, Compte. La suppression est définitive : votre compte et
                        toutes les données associées sont effacés.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Une copie peut subsister dans les sauvegardes chiffrées jusqu’à leur expiration, au plus tard 12 mois après.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-4">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">13. Modifications et contact</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Cette page évolue avec le service et la réglementation. La date de sa dernière mise à jour figure ci-dessous.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Pour toute question sur vos données, écrivez-nous depuis la page <RouterLink to="/contact">Contact</RouterLink>.
                    </p>
                    <p class="text-body-1 font-weight-bold textPrimary mb-0">Dernière mise à jour : novembre 2026</p>
                </section>

                <div class="d-flex flex-wrap ga-3 mt-12">
                    <v-btn color="primary" flat class="text-none" to="/conditions-utilisation">Conditions d’utilisation</v-btn>
                    <v-btn variant="outlined" color="primary" class="text-none" to="/">Retour à l’accueil</v-btn>
                </div>
            </v-container>
        </main>

        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/legal';
@use '@/scss/frontpages/pages/data-protection';
</style>
