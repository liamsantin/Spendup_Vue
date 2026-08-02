<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MailIcon } from 'vue-tabler-icons';
import type { UserSettings } from '../../types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const digestItems = computed(() => [
    { title: t('userSettings.notifications.digest.off'), value: 'off' },
    { title: t('userSettings.notifications.digest.daily'), value: 'daily' },
    { title: t('userSettings.notifications.digest.weekly'), value: 'weekly' }
]);
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <MailIcon class="text-primary" size="25" />
                </v-avatar>
                <div>
                    <h4 class="text-h4 mb-0">{{ t('userSettings.notifications.title') }}</h4>
                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                        {{ t('userSettings.notifications.subtitle') }}
                    </div>
                </div>
            </div>
            <div class="mt-4">
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
                <v-select
                    v-model="draft.notificationDigestFrequency"
                    :items="digestItems"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    hide-details
                />
            </div>
        </v-card-item>
    </v-card>
</template>
