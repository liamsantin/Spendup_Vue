<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { KeyIcon, PencilIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';

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
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <KeyIcon class="text-primary" size="25" />
                </v-avatar>
                <h4 class="text-h4 mb-0">{{ t('accounts.credentials.title') }}</h4>
            </div>
            <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">{{ t('accounts.credentials.hint') }}</div>
            <AppAlert
                v-if="success"
                color="success"
                variant="tonal"
                class="mt-4"
                closable
                :dismiss-ms="5000"
                @dismiss="emit('dismissSuccess')"
            >
                {{ success }}
            </AppAlert>
            <AppAlert v-if="error" type="error" class="mt-4" closable @dismiss="emit('dismissError')">
                {{ error }}
            </AppAlert>
            <AppAlert v-if="pendingEmail" color="warning" variant="tonal" class="mt-4">
                {{ t('accounts.credentials.pendingEmail', { email: pendingEmail }) }}
                <v-btn variant="text" color="warning" size="small" class="ml-1" @click="emit('confirmPendingEmail')">
                    {{ t('accounts.credentials.enterCode') }}
                </v-btn>
            </AppAlert>
            <div class="mt-6">
                <v-row dense>
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
                    <v-btn color="error" variant="outlined" flat @click="emit('unlinkGoogle')">{{
                        t('accounts.credentials.unlinkGoogle')
                    }}</v-btn>
                </div>
            </div>
        </v-card-item>
    </v-card>
</template>

<style scoped>
.account-field-editable,
.account-field-edit-icon {
    cursor: pointer;
}
</style>
