<script setup lang="ts">
import { WandIcon, HeartIcon, CircleCheckIcon } from 'vue-tabler-icons';

const cards = [
    {
        icon: WandIcon,
        title: 'Projet expérimental',
        lead: "Spend.Up est un terrain d'essai. Les fonctionnalités et l'interface peuvent changer à tout moment, sans préavis.",
        items: [
            'Aucun engagement de disponibilité continue.',
            'Les bugs font partie du processus — les retours sont les bienvenus.',
            "L'interface évolue au fil des apprentissages."
        ]
    },
    {
        icon: HeartIcon,
        title: 'À but non lucratif',
        lead: 'Aucun modèle commercial derrière Spend.Up — ni maintenant, ni à terme.',
        items: [
            'Pas de publicité, pas de revente de données.',
            "L'application est et restera gratuite.",
            'Projet personnel orienté apprentissage et utilité.'
        ]
    }
];
</script>

<template>
    <section class="py-12 py-md-16 bg-surface">
        <v-container class="max-width-1218">
            <!-- En-tête -->
            <v-row justify="center" class="mb-10 mb-md-12">
                <v-col cols="12" md="8" class="text-center">
                    <v-chip color="primary" variant="tonal" rounded="md" class="mb-4 font-weight-semibold text-14">
                        Nature du projet
                    </v-chip>
                    <h2 class="text-h3 text-md-h2 font-weight-bold textPrimary mb-4">Construit dans la transparence</h2>
                    <p class="text-18 text-medium-emphasis">
                        Spend.Up ne cherche pas à séduire — il cherche à être utile, honnête et libre d'évoluer.
                    </p>
                </v-col>
            </v-row>

            <!-- Cards côte à côte -->
            <v-row class="justify-center">
                <v-col v-for="card in cards" :key="card.title" cols="12" md="6">
                    <v-card elevation="2" rounded="xl" class="notice-card border h-100 pa-1 pa-sm-2">
                        <!-- En-tête de la card -->
                        <div class="pa-5 pb-3 d-flex align-center ga-4">
                            <div class="notice-icon d-flex align-center justify-center rounded-xl flex-shrink-0">
                                <component :is="card.icon" size="26" class="text-primary" stroke-width="1.5" />
                            </div>
                            <div>
                                <h3 class="text-h6 font-weight-bold textPrimary mb-1">{{ card.title }}</h3>
                                <p class="text-body-2 text-medium-emphasis mb-0 lh-lg">{{ card.lead }}</p>
                            </div>
                        </div>

                        <v-divider class="mx-3 border-opacity-25" />

                        <!-- Liste -->
                        <v-list bg="transparent" class="pa-2">
                            <v-list-item
                                v-for="(item, i) in card.items"
                                :key="i"
                                class="notice-list-item rounded-lg mb-2 px-3 py-3"
                                lines="two"
                            >
                                <template #prepend>
                                    <div class="notice-check d-flex align-center justify-center rounded-md flex-shrink-0 me-3">
                                        <CircleCheckIcon size="18" class="text-primary" stroke-width="1.5" />
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2 font-weight-regular text-wrap text-high-emphasis">
                                    {{ item }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/about/project-notice';
</style>
