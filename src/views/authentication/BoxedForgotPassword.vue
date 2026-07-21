<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import ResetForm from '@/components/auth/ResetForm.vue';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue';

const route = useRoute();
const hasToken = computed(() => typeof route.query.token === 'string' && !!route.query.token);
</script>

<template>
    <div class="authentication">
        <v-container fluid class="pa-3">
            <v-row class="h-100vh d-flex justify-center align-center">
                <v-col cols="12" lg="4" xl="5" class="d-flex align-center">
                    <v-card rounded="md" elevation="10" class="px-sm-1 px-0 mx-auto">
                        <v-card-item class="pa-sm-8">
                            <div class="d-flex justify-center my-5"><Logo /></div>
                            <template v-if="hasToken">
                                <p class="text-subtitle-1 text-center text-10">Choisissez un nouveau mot de passe pour votre compte.</p>
                                <ResetPasswordForm />
                            </template>
                            <template v-else>
                                <p class="text-subtitle-1 text-center text-10">
                                    Indiquez l’e-mail associé à votre compte : nous vous enverrons un lien pour réinitialiser votre mot de
                                    passe.
                                </p>
                                <ResetForm />
                            </template>
                            <v-btn size="large" color="lightprimary" to="/auth/login2" block class="mt-5 text-primary" flat>
                                Retour à la connexion
                            </v-btn>
                        </v-card-item>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>
