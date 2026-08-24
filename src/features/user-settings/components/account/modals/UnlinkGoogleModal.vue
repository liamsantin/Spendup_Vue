<script setup lang="ts">
/**
 * Modal détachement Google — exige le mot de passe local avant confirmation.
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

defineProps<{
    open: boolean;
    password: string;
    saving: boolean;
    error: string | null;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:password': [value: string];
    'update:error': [value: string | null];
    submit: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="t('accounts.unlinkGoogleModal.title')"
        :subtitle="t('accounts.unlinkGoogleModal.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="emit('update:open', $event)"
    >
        <form id="account-unlink-google-form" @submit.prevent="emit('submit')">
            <AppAlert v-if="error" type="error" class="mb-3" closable @dismiss="emit('update:error', null)">
                {{ error }}
            </AppAlert>
            <v-label class="mb-1 font-weight-medium">{{ t('accounts.unlinkGoogleModal.fields.currentPassword') }}</v-label>
            <v-text-field
                :model-value="password"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="current-password"
                density="comfortable"
                hide-details
                :disabled="saving"
                @update:model-value="emit('update:password', $event)"
            />
        </form>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="saving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn
                color="error"
                flat
                type="submit"
                form="account-unlink-google-form"
                :loading="saving"
                :disabled="!password"
            >
                {{ t('accounts.unlinkGoogleModal.confirm') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
