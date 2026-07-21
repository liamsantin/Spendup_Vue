<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';

const route = useRoute();
const auth = useAuthStore();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const tokenFromUrl = computed(() => typeof route.query.token === 'string' && !!route.query.token);
const showManualToken = computed(() => !tokenFromUrl.value);

const passwordRules = [
    (v: string) => !!v,
    (v: string) => !!(v && v.length >= 8),
    (v: string) => /[A-Za-z]/.test(v),
    (v: string) => /\d/.test(v)
];
const confirmPasswordRules = [(v: string) => !!v, (v: string) => v === newPassword.value];
const tokenRules = [(v: string) => !!v.trim()];

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
    if (!token.value.trim()) return;
    if (newPassword.value !== confirmPassword.value) return;
    loading.value = true;
    try {
        await auth.resetPassword(token.value.trim(), newPassword.value);
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
            <AppAlert type="info" class="mb-4"> Collez le jeton reçu par e-mail si le lien n’était pas cliquable. </AppAlert>
            <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Jeton (token)</v-label>
            <VTextField v-model="token" :rules="tokenRules" class="mb-4" hide-details autocomplete="off" />
        </template>

        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Nouveau mot de passe</v-label>
        <VTextField v-model="newPassword" :rules="passwordRules" type="password" class="mb-4" hide-details autocomplete="new-password" />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Confirmer le mot de passe</v-label>
        <VTextField
            v-model="confirmPassword"
            :rules="confirmPasswordRules"
            type="password"
            class="mb-4"
            hide-details
            autocomplete="new-password"
        />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">Réinitialiser</v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
