<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';

const auth = useAuthStore();

const email = ref('');
const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
    error.value = null;
    loading.value = true;
    try {
        await auth.confirmEmailChange(email.value, code.value);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="mt-5">
        <p class="text-subtitle-1 mb-4">Saisissez le code envoyé à votre nouvelle adresse e-mail.</p>
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Nouvel e-mail</v-label>
        <VTextField v-model="email" type="email" class="mb-4" hide-details />
        <v-label class="text-subtitle-1 font-weight-semibold pb-2 text-lightText">Code</v-label>
        <VTextField v-model="code" class="mb-4" hide-details inputmode="numeric" maxlength="6" />
        <v-btn color="primary" size="large" block flat :loading="loading" @click="submit">Confirmer</v-btn>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>
