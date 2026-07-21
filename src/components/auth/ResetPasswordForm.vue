<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth';

const route = useRoute();
const router = useRouter();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const passwordRules = [
    (v: string) => !!v || 'Le mot de passe est requis',
    (v: string) => (v && v.length >= 8) || 'Au moins 8 caractères',
    (v: string) => /[A-Za-z]/.test(v) || 'Doit contenir une lettre',
    (v: string) => /\d/.test(v) || 'Doit contenir un chiffre'
];

onMounted(() => {
    const q = route.query.token;
    if (typeof q === 'string') {
        token.value = q;
    }
});

async function submit() {
    error.value = null;
    if (!token.value) {
        error.value = 'Jeton de réinitialisation manquant. Ouvrez le lien reçu par e-mail.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        error.value = 'Les mots de passe ne correspondent pas.';
        return;
    }
    loading.value = true;
    try {
        await authApi.resetPassword(token.value, newPassword.value);
        await router.push({
            path: '/auth/login',
            query: { notice: 'Mot de passe mis à jour. Veuillez vous connecter.' }
        });
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <v-alert v-if="!token" type="warning" density="compact" class="mb-4">
            Aucun jeton trouvé dans l’URL. Utilisez le lien reçu par e-mail.
        </v-alert>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Nouveau mot de passe</v-label>
        <VTextField
            v-model="newPassword"
            :rules="passwordRules"
            type="password"
            class="mb-4"
            hide-details="auto"
            autocomplete="new-password"
        />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Confirmer le mot de passe</v-label>
        <VTextField v-model="confirmPassword" type="password" class="mb-4" hide-details="auto" autocomplete="new-password" />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">Réinitialiser</v-btn>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>
</template>
