<script setup lang="ts">
import liamPhoto from '@/assets/images/profile/user-1.jpg';
</script>

<template>
    <section class="py-12 py-md-16 bg-lightprimary">
        <v-container class="max-width-1218">
            <v-row align="center" class="flex-column-reverse flex-md-row">
                <!-- Colonne gauche : texte -->
                <v-col cols="12" md="6" class="pe-md-10 mt-10 mt-md-0">
                    <h1 class="text-h3 text-md-h2 font-weight-bold textPrimary mb-5">À propos</h1>
                    <p class="text-18 text-medium-emphasis lh-lg mb-4">
                        Spend.Up est un projet solo, conçu et développé entièrement par Liam Santin, pour une gestion financière plus simple
                        et plus claire.
                    </p>
                    <p class="text-16 text-medium-emphasis lh-lg mb-6">
                        Née d'un besoin personnel, cette plateforme centralise tout ce qui touche à l'argent au quotidien — budgets,
                        revenus, dettes, documents — sans complexité inutile. L'objectif : vous donner une vision claire de votre situation
                        financière, en tout temps.
                    </p>
                </v-col>

                <!-- Colonne droite : photo -->
                <v-col cols="12" md="6" class="d-flex justify-center justify-md-end">
                    <div class="position-relative rounded-16 overflow-hidden su-card-elev su-photo-wrap">
                        <img :src="liamPhoto" alt="Liam Santin" class="su-team-photo" />
                        <div class="bg-surface position-relative py-4 px-3 text-center custom-shadow2 mt-n12 mx-6 rounded-10">
                            <p class="text-subtitle-1 text-medium-emphasis mb-0">Développé par</p>
                            <h2 class="text-h5 textPrimary font-weight-bold mb-1">Liam Santin</h2>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/about/team-section';
</style>
