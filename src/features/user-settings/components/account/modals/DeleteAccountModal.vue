<script setup lang="ts">
/**
 * Modal suppression de compte — confirmation via mot de passe et/ou Google.
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';

defineProps<{
    open: boolean;
    password: string;
    googleIdToken: string | null;
    passwordExpanded: boolean;
    saving: boolean;
    error: string | null;
    showDeleteGoogle: boolean;
    showDeletePassword: boolean;
    canSubmit: boolean;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:password': [value: string];
    'update:passwordExpanded': [value: boolean];
    'update:error': [value: string | null];
    submit: [];
    googleCredential: [idToken: string];
    clearGoogleCredential: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="t('accounts.deleteModal.title')"
        :subtitle="t('accounts.deleteModal.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="emit('update:open', $event)"
    >
        <form id="account-delete-form" @submit.prevent="emit('submit')">
            <AppAlert v-if="error" type="error" class="mb-3" closable @dismiss="emit('update:error', null)">
                {{ error }}
            </AppAlert>
            <p class="text-body-1 mb-4">
                {{ t('accounts.deleteModal.body') }}
            </p>

            <template v-if="showDeleteGoogle">
                <AppAlert
                    v-if="googleIdToken"
                    color="success"
                    variant="tonal"
                    class="mb-3"
                    closable
                    @dismiss="emit('clearGoogleCredential')"
                >
                    {{ t('accounts.deleteModal.googleVerified') }}
                </AppAlert>
                <GoogleSignInButton v-else class="mb-4" @credential="emit('googleCredential', $event)" />
            </template>

            <template v-if="showDeletePassword">
                <div v-if="showDeleteGoogle && !googleIdToken" class="d-flex align-center text-center mb-3">
                    <div class="text-subtitle-2 text-medium-emphasis w-100">{{ t('accounts.deleteModal.or') }}</div>
                </div>

                <v-btn
                    v-if="!passwordExpanded && !googleIdToken"
                    variant="text"
                    color="primary"
                    class="mb-2 px-0"
                    @click="emit('update:passwordExpanded', true)"
                >
                    {{ t('accounts.deleteModal.usePassword') }}
                </v-btn>

                <template v-if="passwordExpanded && !googleIdToken">
                    <v-label class="mb-1 font-weight-medium">{{ t('accounts.deleteModal.fields.currentPassword') }}</v-label>
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
                </template>
            </template>
        </form>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="saving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn
                color="error"
                flat
                type="submit"
                form="account-delete-form"
                :loading="saving"
                :disabled="!canSubmit && !saving"
            >
                {{ t('accounts.deleteModal.confirm') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
