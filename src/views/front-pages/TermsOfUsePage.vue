<script setup lang="ts">
import { FileTextIcon, LockIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import LegalToc from '@/components/frontpages/legal/LegalToc.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
</script>

<template>
    <div class="front-wraper legal-page">
        <AnnounceBar />
        <Header />

        <section class="legal-hero">
            <v-container class="max-width-1218">
                <div class="legal-hero__icon"><FileTextIcon size="30" stroke-width="1.5" /></div>
                <span class="legal-kicker">Accès et utilisation de Spend.Up</span>
                <h1 class="textPrimary">Conditions d’utilisation</h1>
                <p class="text-medium-emphasis">
                    Les règles essentielles pour utiliser Spend.Up de manière sûre, responsable et transparente.
                </p>
                <div class="legal-hero__meta">
                    <span><ShieldCheckIcon size="16" /> Document officiel</span>
                    <span><LockIcon size="16" /> Vos données restent les vôtres</span>
                </div>
            </v-container>
        </section>

        <main class="legal-main">
            <v-container class="max-width-1218 terms-body">
                <LegalToc />
                <div class="legal-intro">
                    <strong>En bref</strong>
                    <p>
                        Vous restez propriétaire de vos données et responsable de votre compte, de votre mot de passe et de votre code de
                        récupération. Spend.Up met en œuvre les mesures nécessaires pour offrir un service fiable et sécurisé.
                    </p>
                </div>

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">1. Objet</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Spend.Up est une plateforme de gestion financière personnelle. Elle permet de suivre vos comptes, vos dépenses, vos
                        budgets et votre patrimoine, seul ou avec vos proches, sans aucune connexion à votre banque.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Spend.Up est un outil de suivi. Il ne fournit aucun conseil financier, fiscal ou juridique, et n’exécute aucune
                        opération bancaire.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        En utilisant le service, vous acceptez les présentes conditions d’utilisation.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">2. Création et gestion du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L’utilisation de Spend.Up nécessite un compte, créé avec une adresse e-mail et un mot de passe, ou avec Google.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Vous vous engagez à :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Fournir des informations exactes et à jour</li>
                        <li class="mb-2">Garder vos identifiants de connexion confidentiels</li>
                        <li class="mb-2">Nous signaler toute utilisation non autorisée de votre compte</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        L’éditeur ne peut être tenu responsable des conséquences d’une divulgation volontaire ou négligente de vos
                        identifiants.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">3. Utilisation du service</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous vous engagez à utiliser Spend.Up conformément aux lois et réglementations en vigueur. Il est notamment interdit
                        de :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">Tenter d’accéder à des données ou à des fonctionnalités sans autorisation</li>
                        <li class="mb-2">Perturber le fonctionnement du service</li>
                        <li class="mb-2">Utiliser Spend.Up à des fins frauduleuses, illicites ou malveillantes</li>
                        <li class="mb-2">Contourner les mécanismes de sécurité mis en place</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">4. Vos données</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous restez propriétaire des données que vous saisissez ou importez dans Spend.Up, et responsable de leur
                        exactitude.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Elles sont hébergées en Suisse et traitées uniquement pour faire fonctionner le service, conformément à la loi
                        fédérale sur la protection des données (nLPD). Le détail figure sur la page
                        <router-link to="/protection-des-donnees">Protection des données</router-link>.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">5. Partage avec vos proches</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous pouvez ajouter des amis et partager avec eux certaines ressources, comme un compte ou une dépense commune. Vous
                        choisissez ce que vous partagez.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Vous êtes responsable de ce que vous partagez. Les informations chiffrées par le Coffre ne sont jamais partagées.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">6. Sécurité et Coffre</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Des mesures de sécurité protègent les comptes et les données. Vos informations les plus sensibles sont en plus
                        chiffrées dans votre navigateur par le Coffre, avec une clé dérivée de votre mot de passe que Spend.Up ne détient
                        pas.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous restez responsable de la sécurité de votre appareil, de votre mot de passe et de votre code de récupération.
                    </p>
                    <AppAlert type="warning" class="text-body-2 mb-0">
                        Si vous oubliez votre mot de passe sans disposer de votre code de récupération, les informations chiffrées par le
                        Coffre deviennent définitivement illisibles. Spend.Up ne peut pas les récupérer.
                    </AppAlert>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">7. Disponibilité et version bêta</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L’éditeur s’efforce d’assurer la disponibilité du service, sans garantir un accès continu et sans interruption. La
                        maintenance, les mises à jour ou un incident technique peuvent l’interrompre temporairement.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Spend.Up est actuellement en version bêta. Pendant cette phase, des fonctionnalités peuvent changer et les données
                        peuvent être réinitialisées.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">8. Suspension ou suppression du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Vous pouvez supprimer votre compte à tout moment, dans Réglages, Compte. La suppression est définitive.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L’éditeur se réserve le droit de suspendre ou de supprimer un compte en cas :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">De non-respect des présentes conditions</li>
                        <li class="mb-2">D’utilisation frauduleuse ou abusive du service</li>
                        <li class="mb-2">D’activité susceptible de compromettre la sécurité ou l’intégrité de Spend.Up</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">9. Limitation de responsabilité</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Spend.Up est fourni « en l’état ».</p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Dans les limites autorisées par la loi, l’éditeur ne peut être tenu responsable des dommages indirects, pertes de
                        données, pertes financières ou interruptions d’activité résultant de l’utilisation du service, ni des décisions
                        prises sur la base des informations qui y figurent.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">10. Évolution des conditions</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Ces conditions peuvent être modifiées pour tenir compte de l’évolution du service, des exigences légales ou des
                        améliorations de sécurité.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Continuer à utiliser Spend.Up après leur publication vaut acceptation des nouvelles conditions.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-4">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">11. Contact</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Pour toute question sur ces conditions, écrivez-nous depuis la page
                        <router-link to="/contact">Contact</router-link>.
                    </p>
                    <p class="text-body-1 font-weight-bold textPrimary mb-0">Dernière mise à jour : novembre 2026</p>
                </section>

                <div class="d-flex flex-wrap ga-3 mt-12">
                    <v-btn color="primary" flat class="text-none" to="/protection-des-donnees">Protection des données</v-btn>
                    <v-btn variant="outlined" color="primary" class="text-none" to="/">Retour à l’accueil</v-btn>
                </div>
            </v-container>
        </main>

        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/legal';
@use '@/scss/frontpages/pages/terms';
</style>
