<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    disabled: [];
}>();

const auth = useAuthStore();
const { t } = useI18n();

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
        error.value = t('security.disableDialog.errors.invalidCode');
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
        :title="t('security.disableDialog.title')"
        :subtitle="t('security.disableDialog.subtitle')"
        :max-width="440"
        :scrollable="false"
    >
        <v-label class="text-subtitle-1 font-weight-semibold pb-2">{{ t('security.disableDialog.otpLabel') }}</v-label>
        <OtpDigitsInput v-model="code" field-class="two-factor-disable-otp" @complete="disable" />
        <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--danger" :disabled="loading" @click="disable()">
                {{ t('security.disableDialog.confirm') }}
            </button>
        </template>
    </AppModalBase>
</template>
