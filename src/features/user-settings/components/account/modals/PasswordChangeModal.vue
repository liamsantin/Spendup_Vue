<script setup lang="ts">
/**
 * Modal création / changement de mot de passe (champ actuel optionnel selon le compte).
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

defineProps<{
    open: boolean;
    requiresCurrentPassword: boolean;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    saving: boolean;
    error: string | null;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:currentPassword': [value: string];
    'update:newPassword': [value: string];
    'update:confirmPassword': [value: string];
    'update:error': [value: string | null];
    submit: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="requiresCurrentPassword ? t('accounts.passwordModal.changeTitle') : t('accounts.passwordModal.setTitle')"
        :subtitle="t('accounts.passwordModal.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="emit('update:open', $event)"
    >
        <form id="account-password-form" @submit.prevent="emit('submit')">
            <AppAlert v-if="error" type="error" class="mb-3" closable @dismiss="emit('update:error', null)">
                {{ error }}
            </AppAlert>
            <template v-if="requiresCurrentPassword">
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.currentPassword') }}</v-label>
                <v-text-field
                    :model-value="currentPassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="current-password"
                    density="comfortable"
                    hide-details
                    class="mb-2"
                    @update:model-value="emit('update:currentPassword', $event)"
                />
            </template>
            <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.newPassword') }}</v-label>
            <v-text-field
                :model-value="newPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="new-password"
                density="comfortable"
                hide-details
                class="mb-2"
                @update:model-value="emit('update:newPassword', $event)"
            />
            <v-label class="mb-1 font-weight-medium">{{ t('accounts.passwordModal.fields.confirmPassword') }}</v-label>
            <v-text-field
                :model-value="confirmPassword"
                color="primary"
                variant="outlined"
                type="password"
                autocomplete="new-password"
                density="comfortable"
                hide-details
                @update:model-value="emit('update:confirmPassword', $event)"
            />
        </form>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="saving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat type="submit" form="account-password-form" :loading="saving">{{ t('common.save') }}</v-btn>
        </template>
    </AppModalBase>
</template>
