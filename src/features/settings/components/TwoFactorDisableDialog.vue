<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    disabled: [];
}>();

const auth = useAuthStore();

const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            code.value = '';
            error.value = null;
            loading.value = false;
        }
    }
);

async function disable(submittedCode?: string) {
    error.value = null;
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = 'Saisissez le code à 6 chiffres de votre application.';
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await auth.disableTwoFactor(otp);
        open.value = false;
        emit('disabled');
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <v-dialog v-model="open" max-width="440" persistent>
        <v-card rounded="md">
            <v-card-item>
                <h5 class="text-h5">Désactiver la double authentification</h5>
                <div class="text-subtitle-1 text-medium-emphasis mt-1">Confirmez avec le code de votre application d’authentification.</div>
            </v-card-item>

            <v-divider />

            <v-card-text class="pa-6">
                <v-label class="text-subtitle-1 font-weight-semibold pb-2">Code à 6 chiffres</v-label>
                <OtpDigitsInput v-model="code" field-class="two-factor-disable-otp" @complete="disable" />
                <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
                <v-btn variant="text" flat @click="open = false">Annuler</v-btn>
                <v-spacer />
                <v-btn color="error" flat :loading="loading" @click="disable()">Désactiver</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
