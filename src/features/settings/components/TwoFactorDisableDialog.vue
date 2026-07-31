<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
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
    <AppModalBase
        v-model="open"
        title="Désactiver la double authentification"
        subtitle="Confirmez avec le code de votre application d’authentification."
        :max-width="440"
        :height="420"
    >
        <v-label class="text-subtitle-1 font-weight-semibold pb-2">Code à 6 chiffres</v-label>
        <OtpDigitsInput v-model="code" field-class="two-factor-disable-otp" @complete="disable" />
        <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>

        <template #footer="{ close }">
            <v-btn variant="text" flat @click="close">Annuler</v-btn>
            <v-spacer />
            <v-btn color="error" flat :loading="loading" @click="disable()">Désactiver</v-btn>
        </template>
    </AppModalBase>
</template>
