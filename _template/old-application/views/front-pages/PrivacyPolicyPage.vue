<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import ContactBar from '@/components/frontpages/shared/ContactBar.vue';
import TextBannerCard from '@/components/frontpages/shared/TextBannerCard.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <TextBannerCard caption="Protection des données personnelles" title="Politique de confidentialité" />

        <div class="py-12 py-md-16">
            <v-container class="max-width-1218 privacy-body">
                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">1. Introduction</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        La présente Politique de confidentialité a pour objectif d'informer les utilisateurs de Spend.Up sur la manière dont
                        leurs données personnelles sont collectées, utilisées, protégées et conservées.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Nous nous engageons à traiter les données personnelles dans le respect des réglementations applicables en matière de
                        protection des données, notamment le Règlement Général sur la Protection des Données (RGPD) lorsque celui-ci est
                        applicable.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        L'utilisation de Spend.Up implique l'acceptation de la présente politique.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">2. Responsable du traitement</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Le responsable du traitement est l'entité exploitant la plateforme Spend.Up.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Pour toute question relative à la protection des données personnelles, vous pouvez nous contacter via les moyens de
                        communication mis à disposition sur la page Contact.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">3. Données collectées</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-6">
                        Dans le cadre de l'utilisation de Spend.Up, nous pouvons collecter différentes catégories de données.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Informations de compte</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Nom et prénom</li>
                        <li class="mb-2">Adresse e-mail</li>
                        <li class="mb-2">Identifiant utilisateur</li>
                        <li class="mb-2">Photo de profil (si fournie)</li>
                        <li class="mb-2">Préférences utilisateur</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Données d'authentification</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Mot de passe (stocké sous forme sécurisée)</li>
                        <li class="mb-2">Informations liées à l'authentification à deux facteurs</li>
                        <li class="mb-2">Informations relatives aux sessions actives</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Données financières</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-6">
                        <li class="mb-2">Revenus enregistrés</li>
                        <li class="mb-2">Dépenses enregistrées</li>
                        <li class="mb-2">Catégories financières</li>
                        <li class="mb-2">Budgets</li>
                        <li class="mb-2">Objectifs financiers</li>
                        <li class="mb-2">Historique financier</li>
                    </ul>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-3">Données techniques</h3>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">Adresse IP</li>
                        <li class="mb-2">Informations sur l'appareil utilisé</li>
                        <li class="mb-2">Type de navigateur</li>
                        <li class="mb-2">Journaux techniques</li>
                        <li class="mb-2">Dates et heures de connexion</li>
                        <li class="mb-2">Informations relatives aux sessions utilisateur</li>
                        <li class="mb-2">Historique des actions de sécurité liées au compte</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">4. Finalités du traitement</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Les données collectées sont utilisées pour :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Fournir les fonctionnalités de la plateforme</li>
                        <li class="mb-2">Gérer les comptes utilisateurs</li>
                        <li class="mb-2">Assurer l'authentification et la sécurité</li>
                        <li class="mb-2">Permettre le suivi financier personnalisé</li>
                        <li class="mb-2">Générer des statistiques et analyses</li>
                        <li class="mb-2">Répondre aux demandes d'assistance</li>
                        <li class="mb-2">Prévenir les accès frauduleux ou abusifs</li>
                        <li class="mb-2">Détecter et prévenir les activités suspectes ou malveillantes</li>
                        <li class="mb-2">Respecter nos obligations légales</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Nous ne traitons les données que pour des finalités légitimes et clairement définies.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">5. Base légale du traitement</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Selon les situations, le traitement des données repose sur :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">L'exécution du contrat entre l'utilisateur et Spend.Up</li>
                        <li class="mb-2">Le respect d'obligations légales</li>
                        <li class="mb-2">L'intérêt légitime lié à la sécurité et à l'amélioration du service</li>
                        <li class="mb-0">Le consentement de l'utilisateur lorsque celui-ci est requis</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">6. Conservation des données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Les données personnelles sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles
                        ont été collectées.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Les durées de conservation peuvent varier selon :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Les obligations légales applicables</li>
                        <li class="mb-2">Les besoins de sécurité</li>
                        <li class="mb-2">Les nécessités techniques liées à l'exploitation du service</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Certaines données liées à la sécurité (journaux d'authentification, événements de sécurité, historiques de sessions)
                        peuvent être conservées pendant une durée limitée lorsque cela est nécessaire à la protection des utilisateurs, à la
                        détection des fraudes ou au respect d'obligations légales.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Lorsque les données ne sont plus nécessaires, elles sont supprimées ou anonymisées.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">7. Sécurité des données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Spend.Up met en œuvre des mesures techniques et organisationnelles destinées à protéger les données contre :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">L'accès non autorisé</li>
                        <li class="mb-2">La divulgation accidentelle</li>
                        <li class="mb-2">La perte de données</li>
                        <li class="mb-2">L'altération des informations</li>
                        <li class="mb-2">Les utilisations abusives</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Ces mesures incluent notamment :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Authentification sécurisée</li>
                        <li class="mb-2">Authentification à deux facteurs (2FA)</li>
                        <li class="mb-2">Contrôle des accès</li>
                        <li class="mb-2">Journalisation des événements de sécurité</li>
                        <li class="mb-2">Protection des sessions utilisateur</li>
                        <li class="mb-2">Surveillance des activités suspectes</li>
                        <li class="mb-2">Vérification de l'adresse e-mail</li>
                        <li class="mb-2">Réinitialisation sécurisée du mot de passe</li>
                        <li class="mb-2">Détection des tentatives de connexion suspectes</li>
                        <li class="mb-2">Révocation des sessions actives par l'utilisateur</li>
                        <li class="mb-2">Protection contre les accès frauduleux</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'utilisateur peut consulter ses sessions actives et révoquer les appareils connectés à son compte afin de conserver
                        le contrôle sur les accès autorisés.
                    </p>
                    <v-alert type="warning" variant="tonal" density="comfortable" class="text-body-2 rounded-lg mb-0" border="start">
                        Malgré toutes les précautions mises en œuvre, aucun système informatique ne peut garantir une sécurité absolue.
                    </v-alert>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">8. Partage des données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Les données personnelles ne sont ni vendues ni cédées à des tiers à des fins commerciales.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Certaines informations peuvent être communiquées à des prestataires techniques intervenant dans :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">L'hébergement du service</li>
                        <li class="mb-2">La maintenance</li>
                        <li class="mb-2">L'envoi d'e-mails</li>
                        <li class="mb-2">Les services d'authentification</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Ces prestataires n'accèdent aux données que dans la mesure strictement nécessaire à leurs missions.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">9. Cookies et technologies similaires</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Spend.Up peut utiliser des cookies ou technologies similaires afin de :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Maintenir les sessions utilisateur</li>
                        <li class="mb-2">Améliorer l'expérience utilisateur</li>
                        <li class="mb-2">Assurer la sécurité du service</li>
                        <li class="mb-2">Mesurer l'utilisation de la plateforme</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        L'utilisateur peut configurer son navigateur pour limiter ou refuser certains cookies, sous réserve des limitations
                        fonctionnelles que cela pourrait entraîner.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">10. Vos droits</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Conformément à la réglementation applicable, vous disposez notamment des droits suivants :
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit d'accès</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Obtenir une copie des données personnelles vous concernant.</p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit de rectification</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Corriger des informations inexactes ou incomplètes.</p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit à l'effacement</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Demander la suppression de vos données lorsque cela est possible.
                    </p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit à la limitation du traitement</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Demander la restriction temporaire de certains traitements.</p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit à la portabilité</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Recevoir certaines données dans un format exploitable.</p>

                    <h3 class="text-subtitle-1 font-weight-bold textPrimary mb-2">Droit d'opposition</h3>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous opposer à certains traitements fondés sur un intérêt légitime.
                    </p>

                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Pour exercer ces droits, vous pouvez nous contacter via les moyens prévus sur la page Contact.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">11. Suppression du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">L'utilisateur peut demander la suppression de son compte.</p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        La suppression entraîne la désactivation du compte ainsi que la suppression ou l'anonymisation des données
                        associées, sous réserve des obligations légales ou des impératifs de sécurité pouvant imposer une conservation
                        limitée de certaines informations.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">12. Modifications de la politique</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        La présente Politique de confidentialité peut être mise à jour afin de refléter :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Les évolutions du service</li>
                        <li class="mb-2">Les modifications réglementaires</li>
                        <li class="mb-2">Les améliorations techniques ou organisationnelles</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        La date de dernière mise à jour est indiquée en bas de cette page.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-4">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">13. Contact</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Pour toute question relative à cette Politique de confidentialité ou à l'exercice de vos droits concernant vos
                        données personnelles, vous pouvez nous contacter via les coordonnées indiquées sur la page Contact.
                    </p>
                    <p class="text-body-1 font-weight-bold textPrimary mb-0">Dernière mise à jour : juin 2026</p>
                </section>

                <div class="d-flex flex-wrap ga-3 mt-12">
                    <v-btn color="primary" flat class="text-none" to="/conditions-utilisation">Conditions d'utilisation</v-btn>
                    <v-btn variant="outlined" color="primary" class="text-none" to="/">Retour à l'accueil</v-btn>
                </div>
            </v-container>
        </div>

        <ContactBar />
        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/privacy';
</style>
