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

        <TextBannerCard caption="Accès et utilisation de Spend.Up" title="Conditions d'utilisation" />

        <div class="py-12 py-md-16">
            <v-container class="max-width-1218 terms-body">
                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">1. Objet</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'application permet aux utilisateurs de gérer et consulter leurs informations personnelles, financières et
                        opérationnelles au sein d'un environnement sécurisé.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        En utilisant le service, vous acceptez les présentes conditions d'utilisation.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">2. Création et gestion du compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'accès à certaines fonctionnalités nécessite la création d'un compte utilisateur.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">L'utilisateur s'engage à :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-4">
                        <li class="mb-2">Fournir des informations exactes et à jour</li>
                        <li class="mb-2">Préserver la confidentialité de ses identifiants de connexion</li>
                        <li class="mb-2">Signaler toute utilisation non autorisée de son compte</li>
                    </ul>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        L'éditeur ne pourra être tenu responsable des conséquences liées à une divulgation volontaire ou négligente des
                        identifiants.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">3. Utilisation du service</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'utilisateur s'engage à utiliser l'application conformément aux lois et réglementations en vigueur.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">Il est notamment interdit de :</p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">Tenter d'accéder à des données ou fonctionnalités sans autorisation</li>
                        <li class="mb-2">Perturber le fonctionnement du service</li>
                        <li class="mb-2">Utiliser l'application à des fins frauduleuses, illicites ou malveillantes</li>
                        <li class="mb-0">Contourner les mécanismes de sécurité mis en place</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">4. Données utilisateur</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'utilisateur reste propriétaire des données qu'il renseigne dans l'application.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'application traite ces données uniquement dans le cadre du fonctionnement du service et conformément à la
                        <router-link to="/politique-confidentialite" class="text-primary text-decoration-none font-weight-medium">
                            politique de confidentialité </router-link
                        >.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        L'utilisateur est responsable de l'exactitude des informations qu'il fournit.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">5. Disponibilité du service</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'éditeur s'efforce d'assurer la disponibilité du service mais ne garantit pas un accès continu et sans
                        interruption.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Des opérations de maintenance, mises à jour ou incidents techniques peuvent entraîner une interruption temporaire du
                        service.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">6. Sécurité</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Des mesures de sécurité sont mises en œuvre afin de protéger les comptes et les données des utilisateurs.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Chaque utilisateur demeure responsable de la sécurité de son appareil, de son mot de passe et des accès à son
                        compte.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">7. Suspension ou suppression de compte</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        L'éditeur se réserve le droit de suspendre ou supprimer un compte en cas :
                    </p>
                    <ul class="text-body-1 text-medium-emphasis lh-lg ps-5 mb-0">
                        <li class="mb-2">De non-respect des présentes conditions</li>
                        <li class="mb-2">D'utilisation frauduleuse ou abusive du service</li>
                        <li class="mb-0">D'activité susceptible de compromettre la sécurité ou l'intégrité de l'application</li>
                    </ul>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">8. Limitation de responsabilité</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">L'application est fournie « en l'état ».</p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Dans les limites autorisées par la loi, l'éditeur ne pourra être tenu responsable des dommages indirects, pertes de
                        données, pertes financières ou interruptions d'activité résultant de l'utilisation du service.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-10">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">9. Évolution des conditions</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-4">
                        Les présentes conditions peuvent être modifiées à tout moment afin de tenir compte de l'évolution du service, des
                        exigences légales ou des améliorations de sécurité.
                    </p>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        La poursuite de l'utilisation de l'application après publication des modifications vaut acceptation des nouvelles
                        conditions.
                    </p>
                </section>

                <v-divider class="my-10" />

                <section class="mb-4">
                    <h2 class="text-h5 font-weight-bold textPrimary mb-4">10. Contact</h2>
                    <p class="text-body-1 text-medium-emphasis lh-lg mb-0">
                        Pour toute question relative aux présentes conditions d'utilisation, vous pouvez contacter l'administrateur ou le
                        responsable du service via les moyens de contact mis à disposition dans l'application.
                    </p>
                </section>

                <div class="d-flex flex-wrap ga-3 mt-12">
                    <v-btn color="primary" flat class="text-none" to="/politique-confidentialite">Politique de confidentialité</v-btn>
                    <v-btn variant="outlined" color="primary" class="text-none" to="/">Retour à l'accueil</v-btn>
                </div>
            </v-container>
        </div>

        <ContactBar />
        <Footer />
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/terms';
</style>
