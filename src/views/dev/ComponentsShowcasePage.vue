<script setup lang="ts">
defineOptions({ name: 'ComponentsShowcasePage' });

import { ref } from 'vue';
import AppAlert from '@/components/shared/AppAlert.vue';

const closableOpen = ref(true);
const actionOpen = ref(true);
</script>

<template>
    <div class="pa-6 pa-md-10 mx-auto" style="max-width: 880px">
        <h1 class="text-h4 font-weight-bold textPrimary mb-2">Présentation des composants</h1>
        <p class="text-subtitle-1 text-medium-emphasis mb-8">
            Page interne développement uniquement (<code>VITE_APP_ENV=development</code>). Accès par URL
            <code>/components</code> — aucun lien dans l’app.
        </p>

        <section class="mb-10">
            <h2 class="text-h5 font-weight-bold textPrimary mb-1">AppAlert</h2>
            <p class="text-body-2 text-medium-emphasis mb-6">
                Wrapper <code>v-alert</code> — voir <code>docs/components/alert/alert-component.md</code>
            </p>

            <h3 class="text-h6 font-weight-semibold mb-3">Filled</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert type="error">Message d’erreur (filled)</AppAlert>
                <AppAlert type="warning">Avertissement (filled)</AppAlert>
                <AppAlert type="info">Information (filled)</AppAlert>
                <AppAlert type="success">Succès (filled)</AppAlert>
            </div>

            <h3 class="text-h6 font-weight-semibold mb-3">Tonal</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert color="error" variant="tonal">Erreur tonale</AppAlert>
                <AppAlert color="warning" variant="tonal">Warning tonal</AppAlert>
                <AppAlert color="info" variant="tonal">Info tonale</AppAlert>
                <AppAlert color="success" variant="tonal">Succès tonal</AppAlert>
            </div>

            <h3 class="text-h6 font-weight-semibold mb-3">Outlined</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert type="error" variant="outlined">Erreur outlined</AppAlert>
                <AppAlert type="warning" variant="outlined">Warning outlined</AppAlert>
                <AppAlert type="info" variant="outlined">Info outlined</AppAlert>
                <AppAlert type="success" variant="outlined">Succès outlined</AppAlert>
            </div>

            <h3 class="text-h6 font-weight-semibold mb-3">Description</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert type="error" variant="tonal">
                    <h5 class="text-h6 text-capitalize">error</h5>
                    <div>Ceci est une alerte d’erreur avec titre et corps.</div>
                </AppAlert>
                <AppAlert type="warning" variant="tonal">
                    <h5 class="text-h6 text-capitalize">warning</h5>
                    <div>Ceci est une alerte d’avertissement avec titre et corps.</div>
                </AppAlert>
                <AppAlert type="info" variant="tonal">
                    <h5 class="text-h6 text-capitalize">info</h5>
                    <div>Ceci est une alerte d’information avec titre et corps.</div>
                </AppAlert>
                <AppAlert type="success" variant="tonal">
                    <h5 class="text-h6 text-capitalize">success</h5>
                    <div>Ceci est une alerte de succès avec titre et corps.</div>
                </AppAlert>
            </div>

            <h3 class="text-h6 font-weight-semibold mb-3">Avec icône</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert color="success" variant="tonal">
                    <template #prepend>
                        <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                    </template>
                    Opération réussie.
                </AppAlert>
                <AppAlert color="info" variant="tonal">
                    <template #prepend>
                        <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                    </template>
                    Information avec icône.
                </AppAlert>
                <AppAlert color="warning" variant="tonal">
                    <template #prepend>
                        <v-icon class="text-24">mdi-alert-outline</v-icon>
                    </template>
                    Avertissement avec icône.
                </AppAlert>
                <AppAlert color="error" variant="tonal">
                    <template #prepend>
                        <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                    </template>
                    Erreur avec icône.
                </AppAlert>
            </div>

            <h3 class="text-h6 font-weight-semibold mb-3">Closable</h3>
            <div class="d-flex flex-column ga-3 mb-8">
                <AppAlert
                    v-if="closableOpen"
                    v-model="closableOpen"
                    border="start"
                    variant="tonal"
                    color="primary"
                    title="Alerte fermable"
                    closable
                    close-label="Fermer"
                >
                    Contenu de l’alerte — fermez-la avec la croix.
                </AppAlert>
                <p v-else class="text-body-2 text-medium-emphasis">Alerte fermée (rechargez la page pour la réafficher).</p>

                <AppAlert v-if="actionOpen" v-model="actionOpen" type="warning" closable class="single-line-alert">
                    <div>Message court avec fermeture.</div>
                    <template #prepend>
                        <v-icon class="text-24">mdi-alert-outline</v-icon>
                    </template>
                </AppAlert>
            </div>
        </section>
    </div>
</template>
