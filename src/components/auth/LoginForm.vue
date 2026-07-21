<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth-store';
import { Form } from 'vee-validate';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

const route = useRoute();
const authStore = useAuthStore();

const notice = ref<string | null>(null);
const password = ref('');
const email = ref('');
const passwordRules = ref([(v: string) => !!v || 'Le mot de passe est requis']);
const emailRules = ref([(v: string) => !!v || 'L’e-mail est requis', (v: string) => /.+@.+\..+/.test(v) || 'L’e-mail doit être valide']);

onMounted(() => {
    const q = route.query.notice;
    if (typeof q === 'string' && q) {
        notice.value = q;
    }
});

function validate(_values: Record<string, unknown>, { setErrors }: { setErrors: (errors: Record<string, string>) => void }) {
    return authStore.login(email.value, password.value).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setErrors({ apiError: message });
    });
}

async function onGoogleCredential(idToken: string) {
    try {
        await authStore.loginWithGoogle(idToken);
    } catch (error: unknown) {
        notice.value = error instanceof Error ? error.message : String(error);
    }
}
</script>

<template>
    <v-alert v-if="notice" type="info" variant="tonal" class="mb-4" density="compact">{{ notice }}</v-alert>

    <GoogleSignInButton class="mb-4" @credential="onGoogleCredential" />

    <div class="d-flex align-center text-center mb-6">
        <div class="text-h6 w-100 px-5 font-weight-regular auth-divider position-relative">
            <span class="bg-surface px-5 py-3 position-relative">ou connectez-vous avec l’e-mail</span>
        </div>
    </div>

    <Form @submit="validate" v-slot="{ errors, isSubmitting }" class="mt-5">
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">E-mail</v-label>
        <VTextField v-model="email" :rules="emailRules" class="mb-8" required hide-details="auto" type="email" autocomplete="email" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Mot de passe</v-label>
        <VTextField
            v-model="password"
            :rules="passwordRules"
            required
            hide-details="auto"
            type="password"
            class="pwdInput"
            autocomplete="current-password"
        />
        <div class="d-flex flex-wrap align-center my-3 justify-end">
            <RouterLink to="/auth/forgot-password" class="text-primary text-decoration-none text-body-1 opacity-1 font-weight-medium">
                Mot de passe oublié ?
            </RouterLink>
        </div>
        <v-btn size="large" :loading="isSubmitting" color="primary" block type="submit" flat>Se connecter</v-btn>
        <div v-if="errors.apiError" class="mt-2">
            <v-alert color="error">{{ errors.apiError }}</v-alert>
        </div>
    </Form>
</template>
