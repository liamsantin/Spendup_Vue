<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

defineProps<{
    open: boolean;
    includesPassword: boolean;
    usernameDraft: string;
    usernamePassword: string;
    usernamePasswordConfirm: string;
    saving: boolean;
    error: string | null;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'update:usernameDraft': [value: string];
    'update:usernamePassword': [value: string];
    'update:usernamePasswordConfirm': [value: string];
    'update:error': [value: string | null];
    save: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="includesPassword ? t('accounts.usernameModal.createTitle') : t('accounts.usernameModal.editTitle')"
        :subtitle="includesPassword ? t('accounts.usernameModal.createSubtitle') : t('accounts.usernameModal.editSubtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="emit('update:open', $event)"
    >
        <form id="account-username-form" @submit.prevent="emit('save')">
            <AppAlert v-if="error" type="error" class="mb-4" closable @dismiss="emit('update:error', null)">
                {{ error }}
            </AppAlert>
            <v-label class="mb-2 font-weight-medium">{{ t('accounts.usernameModal.fields.username') }}</v-label>
            <v-text-field
                :model-value="usernameDraft"
                color="primary"
                variant="outlined"
                hide-details
                autofocus
                :class="includesPassword ? 'mb-2' : undefined"
                @update:model-value="emit('update:usernameDraft', $event)"
            />
            <template v-if="includesPassword">
                <div class="text-caption text-medium-emphasis mb-2">{{ t('accounts.usernameModal.usernameHint') }}</div>
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.usernameModal.fields.password') }}</v-label>
                <v-text-field
                    :model-value="usernamePassword"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="new-password"
                    density="comfortable"
                    hide-details
                    class="mb-2"
                    @update:model-value="emit('update:usernamePassword', $event)"
                />
                <v-label class="mb-1 font-weight-medium">{{ t('accounts.usernameModal.fields.confirmPassword') }}</v-label>
                <v-text-field
                    :model-value="usernamePasswordConfirm"
                    color="primary"
                    variant="outlined"
                    type="password"
                    autocomplete="new-password"
                    density="comfortable"
                    hide-details
                    @update:model-value="emit('update:usernamePasswordConfirm', $event)"
                />
            </template>
        </form>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="saving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat type="submit" form="account-username-form" :loading="saving">{{ t('common.save') }}</v-btn>
        </template>
    </AppModalBase>
</template>
