<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth';

const route = useRoute();
const router = useRouter();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const tokenFromUrl = computed(() => typeof route.query.token === 'string' && !!route.query.token);
const showManualToken = computed(() => !tokenFromUrl.value);

const passwordRules = [
    (v: string) => !!v || 'Le mot de passe est requis',
    (v: string) => (v && v.length >= 8) || 'Au moins 8 caractères',
    (v: string) => /[A-Za-z]/.test(v) || 'Doit contenir une lettre',
    (v: string) => /\d/.test(v) || 'Doit contenir un chiffre'
];

function syncTokenFromRoute() {
    const q = route.query.token;
    if (typeof q === 'string' && q) {
        token.value = q;
    }
}

onMounted(syncTokenFromRoute);
watch(() => route.query.token, syncTokenFromRoute);

async function submit() {
    error.value = null;
    if (!token.value.trim()) {
        error.value = 'Jeton de réinitialisation manquant. Ouvrez le lien reçu par e-mail, ou collez le jeton ci-dessous.';
        return;
    }
    if (newPassword.value !== confirmPassword.value) {
        error.value = 'Les mots de passe ne correspondent pas.';
        return;
    }
    loading.value = true;
    try {
        await authApi.resetPassword(token.value.trim(), newPassword.value);
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
        <template v-if="showManualToken">
            <v-alert type="info" density="compact" class="mb-4">
                Collez le jeton reçu par e-mail si le lien n’était pas cliquable.
            </v-alert>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Jeton (token)</v-label>
            <VTextField v-model="token" class="mb-4" hide-details="auto" autocomplete="off" />
        </template>

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
