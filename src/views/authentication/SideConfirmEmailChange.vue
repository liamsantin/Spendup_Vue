<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '@/features/auth';
import { useAuthStore } from '@/app/stores/auth-store';
import Logo from '@/layouts/full/logo/Logo.vue';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
    error.value = null;
    loading.value = true;
    try {
        await authApi.confirmEmailChange(email.value, code.value);
        await auth.forceReLogin('E-mail mis à jour. Veuillez vous reconnecter.');
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="pa-3">
        <v-row class="h-100vh mh-100 auth">
            <v-col cols="12" lg="8" xl="8" xxl="9" class="d-lg-flex align-center justify-center authentication position-relative">
                <div class="auth-header pt-sm-6 pt-2 px-sm-6 px-3 pb-sm-6 pb-0">
                    <div class="position-relative"><Logo /></div>
                </div>
                <div class="">
                    <img src="@/assets/images/backgrounds/login-bg.svg" class="position-relative d-none d-lg-flex" alt="login-background" />
                </div>
            </v-col>
            <v-col cols="12" lg="4" xl="4" xxl="3" class="d-flex align-center justify-center">
                <div class="pa-sm-7 pa-4 w-100">
                    <h2 class="text--darken-2 text-h4 font-weight-bold">Confirmer le nouvel e-mail</h2>
                    <p class="text-subtitle-1 py-4 text-10">Saisissez le code envoyé à votre nouvelle adresse e-mail.</p>
                    <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Nouvel e-mail</v-label>
                    <VTextField v-model="email" type="email" class="mb-4" hide-details="auto" />
                    <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code</v-label>
                    <VTextField v-model="code" class="mb-4" hide-details="auto" inputmode="numeric" maxlength="6" />
                    <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">Confirmer</v-btn>
                    <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
                    <v-btn size="large" color="lightprimary" block class="mt-5 text-primary" flat @click="router.push('/auth/login')">
                        Retour à la connexion
                    </v-btn>
                </div>
            </v-col>
        </v-row>
    </div>
</template>
