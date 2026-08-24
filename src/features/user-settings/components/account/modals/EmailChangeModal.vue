<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

defineProps<{
    open: boolean;
    currentEmail: string | null;
    emailDraft: string;
    emailCurrentPassword: string;
    saving: boolean;
    error: string | null;
    showEmailPassword: boolean;
    showEmailGoogle: boolean;
    canSubmit: boolean;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:emailDraft': [value: string];
    'update:emailCurrentPassword': [value: string];
    'update:error': [value: string | null];
    submit: [];
    googleCredential: [idToken: string];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="currentEmail ? t('accounts.emailModal.changeTitle') : t('accounts.emailModal.addTitle')"
        :subtitle="t('accounts.emailModal.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="emit('update:open', $event)"
    >
        <form id="account-email-form" @submit.prevent="emit('submit')">
            <AppAlert v-if="error" type="error" class="mb-3" closable @dismiss="emit('update:error', null)">
                {{ error }}
            </AppAlert>
            <v-label class="mb-1 font-weight-medium">{{
                currentEmail ? t('accounts.emailModal.fields.newEmail') : t('accounts.emailModal.fields.email')
            }}</v-label>
            <v-text-field
                :model-value="emailDraft"
                color="primary"
                variant="outlined"
                type="email"
                autocomplete="email"
                density="comfortable"
                hide-details
                class="mb-2"
                :disabled="saving"
                @update:model-value="emit('update:emailDraft', $event)"
            />
            <template v-if="showEmailPassword">
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.emailModal.fields.currentPassword') }}</v-label>
                <v-text-field
                    :model-value="emailCurrentPassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="current-password"
                    density="comfortable"
                    hide-details
                    :disabled="saving"
                    @update:model-value="emit('update:emailCurrentPassword', $event)"
                />
            </template>
            <template v-else-if="showEmailGoogle">
                <p class="text-subtitle-2 text-medium-emphasis mb-3">{{ t('accounts.emailModal.googleHint') }}</p>
                <GoogleSignInButton @credential="emit('googleCredential', $event)" />
            </template>
        </form>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="saving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn
                v-if="showEmailPassword"
                color="primary"
                flat
                type="submit"
                form="account-email-form"
                :loading="saving"
                :disabled="!canSubmit"
            >
                {{ t('accounts.emailModal.continue') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
