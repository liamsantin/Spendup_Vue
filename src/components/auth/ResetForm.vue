<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '@/features/auth';

const valid = ref(false);
const email = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const emailRules = [(v: string) => !!v || 'L’e-mail est requis', (v: string) => /.+@.+\..+/.test(v) || 'L’e-mail doit être valide'];

async function onSubmit() {
    error.value = null;
    success.value = null;
    loading.value = true;
    try {
        await authApi.forgotPassword(email.value);
        success.value = 'Si un compte existe pour cet e-mail, vous recevrez bientôt un lien de réinitialisation.';
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <v-form v-model="valid" @submit.prevent="onSubmit" class="mt-sm-13 mt-8">
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Adresse e-mail</v-label>
        <VTextField v-model="email" :rules="emailRules" required hide-details="auto" type="email" autocomplete="email" />
        <v-btn size="large" color="primary" block type="submit" class="mt-4" :loading="loading" :disabled="!valid" flat>
            Envoyer le lien
        </v-btn>
        <v-alert v-if="success" type="success" class="mt-3" density="compact">{{ success }}</v-alert>
        <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </v-form>
</template>
