<script setup lang="ts">
import Logo from '@/layouts/full/logo/Logo.vue';
import TwoStepForm from '@/components/auth/TwoStepForm.vue';
</script>
<template>
    <div class="authentication">
        <v-container fluid class="pa-3">
            <v-row class="h-100vh d-flex justify-center align-center">
                <v-col cols="12" lg="4" xl="5" class="d-flex align-center">
                    <v-card rounded="md" elevation="10" class="px-sm-1 px-0 mx-auto" max-width="455">
                        <v-card-item class="pa-sm-8">
                            <div class="d-flex justify-center py-4"><Logo /></div>
                            <p class="text-subtitle-1 text-center mt-2 text-13">
                                Saisissez le code de votre application d’authentification, ou un code de récupération.
                            </p>
                            <TwoStepForm />
                        </v-card-item>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>
