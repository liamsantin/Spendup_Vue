<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { KeyIcon, PencilIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';

defineProps<{
    username: string;
    email: string;
    pendingEmail: string | null;
    showPasswordField: boolean;
    canUnlinkGoogle: boolean;
    success: string | null;
    error: string | null;
}>();

const emit = defineEmits<{
    editUsername: [];
    editEmail: [];
    editPassword: [];
    unlinkGoogle: [];
    confirmPendingEmail: [];
    dismissSuccess: [];
    dismissError: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppGlassCard :title="t('accounts.credentials.title')" :subtitle="t('accounts.credentials.hint')">
        <template #icon>
            <KeyIcon :size="20" stroke-width="1.5" />
        </template>
        <AppAlert v-if="success" type="success" class="mt-4" closable :dismiss-ms="5000" @dismiss="emit('dismissSuccess')">
            {{ success }}
        </AppAlert>
        <AppAlert v-if="error" type="error" class="mt-4" closable @dismiss="emit('dismissError')">
            {{ error }}
        </AppAlert>
        <AppAlert v-if="pendingEmail" type="warning" class="mt-4">
            {{ t('accounts.credentials.pendingEmail', { email: pendingEmail }) }}
            <button type="button" class="su-btn su-btn--warn ml-1" @click="emit('confirmPendingEmail')">
                {{ t('accounts.credentials.enterCode') }}
            </button>
        </AppAlert>
        <div class="mt-2">
            <v-row>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.credentials.fields.username') }}</v-label>
                    <v-text-field
                        :model-value="username"
                        color="primary"
                        variant="outlined"
                        hide-details
                        readonly
                        class="account-field-editable"
                        @click="emit('editUsername')"
                    >
                        <template #append-inner>
                            <PencilIcon
                                size="18"
                                stroke-width="1.5"
                                class="text-medium-emphasis account-field-edit-icon"
                                @click.stop="emit('editUsername')"
                            />
                        </template>
                    </v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.credentials.fields.email') }}</v-label>
                    <v-text-field
                        :model-value="email"
                        color="primary"
                        variant="outlined"
                        hide-details
                        readonly
                        class="account-field-editable"
                        @click="emit('editEmail')"
                    >
                        <template #append-inner>
                            <PencilIcon
                                size="18"
                                stroke-width="1.5"
                                class="text-medium-emphasis account-field-edit-icon"
                                @click.stop="emit('editEmail')"
                            />
                        </template>
                    </v-text-field>
                </v-col>
                <v-col v-if="showPasswordField" cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.credentials.fields.password') }}</v-label>
                    <v-text-field
                        model-value="••••••••"
                        color="primary"
                        variant="outlined"
                        hide-details
                        readonly
                        class="account-field-editable"
                        @click="emit('editPassword')"
                    >
                        <template #append-inner>
                            <PencilIcon
                                size="18"
                                stroke-width="1.5"
                                class="text-medium-emphasis account-field-edit-icon"
                                @click.stop="emit('editPassword')"
                            />
                        </template>
                    </v-text-field>
                </v-col>
            </v-row>
            <div v-if="canUnlinkGoogle" class="d-flex align-center justify-space-between flex-wrap ga-3 mt-5">
                <span class="text-subtitle-1 text-medium-emphasis">{{ t('accounts.credentials.googleLinked') }}</span>
                <button type="button" class="su-btn su-btn--danger" @click="emit('unlinkGoogle')">
                    {{ t('accounts.credentials.unlinkGoogle') }}
                </button>
            </div>
        </div>
    </AppGlassCard>
</template>

<style scoped>
.account-field-editable,
.account-field-edit-icon {
    cursor: pointer;
}
</style>
