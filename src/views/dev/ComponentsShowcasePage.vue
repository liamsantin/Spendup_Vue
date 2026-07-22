<script setup lang="ts">
/**
 * Showcase composants (dev only).
 * Onglet Alert = clone `_template/modernize/components/ui-components/alert/*`.
 */
defineOptions({ name: 'ComponentsShowcasePage' });

import { ref } from 'vue';
import AppAlert from '@/components/shared/AppAlert.vue';

const tab = ref('alert');
const closableOpen = ref(true);
</script>

<template>
    <div class="pa-6 pa-md-10 mx-auto" style="max-width: 880px">
        <h1 class="text-h4 font-weight-bold textPrimary mb-2">Présentation des composants</h1>
        <p class="text-subtitle-1 text-medium-emphasis mb-6">
            Page interne développement uniquement (<code>VITE_APP_ENV=development</code>). Accès par URL
            <code>/components</code> — aucun lien dans l’app.
        </p>

        <v-tabs v-model="tab" color="primary" class="mb-4">
            <v-tab value="alert">Alert</v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
            <v-tabs-window-item value="alert">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppAlert</code> — clone Modernize
                    <code>_template/modernize/components/ui-components/alert/</code>
                </p>

                <!-- Basic.vue → tonal + color (pas de density = default) -->
                <h3 class="text-h6 font-weight-semibold mb-3">Basic (tonal)</h3>
                <div class="mb-8">
                    <AppAlert class="mb-3" color="error" variant="tonal" density="default">This is an error alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" color="warning" variant="tonal" density="default"
                        >This is a warning alert — check it out!</AppAlert
                    >
                    <AppAlert class="mb-3" color="info" variant="tonal" density="default">This is an info alert — check it out!</AppAlert>
                    <AppAlert color="success" variant="tonal" density="default">This is a success alert — check it out!</AppAlert>
                </div>

                <!-- Filled.vue → type uniquement -->
                <h3 class="text-h6 font-weight-semibold mb-3">Filled</h3>
                <div class="mb-8">
                    <AppAlert class="mb-3" type="error" density="default">This is an error alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" type="warning" density="default">This is a warning alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" type="info" density="default">This is an info alert — check it out!</AppAlert>
                    <AppAlert type="success" density="default">This is a success alert — check it out!</AppAlert>
                </div>

                <!-- Outlined.vue → outlined + compact + prepend icons -->
                <h3 class="text-h6 font-weight-semibold mb-3">Outlined</h3>
                <div class="mb-8">
                    <AppAlert type="error" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                        </template>
                        <div>This is an error alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="warning" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-outline</v-icon>
                        </template>
                        <div>This is a warning alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="info" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                        </template>
                        <div>This is an info alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="success" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                        </template>
                        <div>This is a success alert — check it out!</div>
                    </AppAlert>
                </div>

                <!-- Description.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Description</h3>
                <div class="mb-8">
                    <AppAlert type="error" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">error</h5>
                        <div>This is an error alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="warning" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">warning</h5>
                        <div>This is an warning alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="info" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">info</h5>
                        <div>This is an info alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="success" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">success</h5>
                        <div>This is an success alert — check it out!</div>
                    </AppAlert>
                </div>

                <!-- Icons.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Icons</h3>
                <div class="mb-8">
                    <AppAlert color="success" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                        </template>
                        <div>This is an success alert.</div>
                    </AppAlert>
                    <AppAlert color="info" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                        </template>
                        <div>This is an info alert.</div>
                    </AppAlert>
                    <AppAlert color="warning" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-outline</v-icon>
                        </template>
                        <div>This is an warning alert.</div>
                    </AppAlert>
                    <AppAlert color="error" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                        </template>
                        <div>This is an error alert.</div>
                    </AppAlert>
                </div>

                <!-- Closable.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Closable</h3>
                <div class="mb-8">
                    <AppAlert
                        v-model="closableOpen"
                        border="start"
                        variant="tonal"
                        density="default"
                        closable
                        close-label="Close Alert"
                        color="primary"
                        title="Closable Alert"
                    >
                        Aenean imperdiet. Quisque id odio. Cras dapibus. Pellentesque ut neque. Cras dapibus. Vivamus consectetuer hendrerit
                        lacus. Sed mollis, eros et ultrices tempus, mauris ipsum aliquam libero, non
                    </AppAlert>
                    <div v-if="!closableOpen" class="mt-3">
                        <v-btn color="primary" flat @click="closableOpen = true">Reset</v-btn>
                    </div>
                </div>

                <!-- Action.vue → compact + single-line-alert -->
                <h3 class="text-h6 font-weight-semibold mb-3">Action</h3>
                <div class="mb-8">
                    <AppAlert type="warning" density="compact" class="mb-4 single-line-alert" closable>
                        <div>This is an warning alert — check it out!</div>
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-outline</v-icon>
                        </template>
                    </AppAlert>
                    <AppAlert type="info" density="compact" class="mb-4 single-line-alert" closable>
                        <div>This is an info alert — check it out!</div>
                        <template #prepend>
                            <v-icon class="text-24">mdi-alert-circle-outline</v-icon>
                        </template>
                    </AppAlert>
                </div>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>
