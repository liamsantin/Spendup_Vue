<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MailIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import type { UserSettings } from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const digestItems = computed(() => [
    { title: t('userSettings.notifications.digest.off'), value: 'off' },
    { title: t('userSettings.notifications.digest.daily'), value: 'daily' },
    { title: t('userSettings.notifications.digest.weekly'), value: 'weekly' }
]);
</script>

<template>
    <AppGlassCard :title="t('userSettings.notifications.title')" :subtitle="t('userSettings.notifications.subtitle')">
        <template #icon>
            <MailIcon :size="20" stroke-width="1.5" />
        </template>
        <div>
            <h6 class="text-h6 mb-2">{{ t('userSettings.notifications.emailSection') }}</h6>
            <v-switch
                v-model="draft.emailSecurityAlerts"
                color="primary"
                hide-details
                class="mb-2"
                :label="t('userSettings.notifications.emailSecurityAlerts')"
            />
            <v-switch
                v-model="draft.emailFriendRequest"
                color="primary"
                hide-details
                class="mb-2"
                :label="t('userSettings.notifications.emailFriendRequest')"
            />
            <v-switch
                v-model="draft.emailFinancialAlerts"
                color="primary"
                hide-details
                class="mb-4"
                :label="t('userSettings.notifications.emailFinancialAlerts')"
            />

            <h6 class="text-h6 mb-2">{{ t('userSettings.notifications.pushSection') }}</h6>
            <v-switch
                v-model="draft.pushNotifications"
                color="primary"
                hide-details
                class="mb-2"
                :label="t('userSettings.notifications.pushNotifications')"
            />
            <v-switch
                v-model="draft.pushSecurityAlerts"
                color="primary"
                hide-details
                class="mb-2"
                :label="t('userSettings.notifications.pushSecurityAlerts')"
            />
            <v-switch
                v-model="draft.pushFriendRequest"
                color="primary"
                hide-details
                class="mb-2"
                :label="t('userSettings.notifications.pushFriendRequest')"
            />
            <v-switch
                v-model="draft.pushFinancialAlerts"
                color="primary"
                hide-details
                class="mb-4"
                :label="t('userSettings.notifications.pushFinancialAlerts')"
            />

            <v-label class="mb-2 font-weight-medium">{{ t('userSettings.notifications.digestFrequency') }}</v-label>
            <AppSelect
                v-model="draft.notificationDigestFrequency"
                :items="digestItems"
                item-title="title"
                item-value="value"
                :label="t('userSettings.notifications.digestFrequency')"
                hide-details
            />
        </div>
    </AppGlassCard>
</template>
