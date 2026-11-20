<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import type { UserSettings } from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const digestItems = computed(() => [
    { title: t('userSettings.notifications.digest.off'), value: 'off' },
    { title: t('userSettings.notifications.digest.daily'), value: 'daily' },
    { title: t('userSettings.notifications.digest.weekly'), value: 'weekly' }
]);

type SwitchKey =
    | 'emailSecurityAlerts'
    | 'emailFriendRequest'
    | 'emailFinancialAlerts'
    | 'pushNotifications'
    | 'pushSecurityAlerts'
    | 'pushFriendRequest'
    | 'pushFinancialAlerts';

const emailSwitches: SwitchKey[] = ['emailSecurityAlerts', 'emailFriendRequest', 'emailFinancialAlerts'];
const pushSwitches: SwitchKey[] = ['pushNotifications', 'pushSecurityAlerts', 'pushFriendRequest', 'pushFinancialAlerts'];
</script>

<template>
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('userSettings.notifications.title') }}</h2>
            <p>{{ t('userSettings.notifications.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="su-field">
                <span class="su-field__label">{{ t('userSettings.notifications.emailSection') }}</span>
                <div class="su-switch-row" v-for="key in emailSwitches" :key="key">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" :for="`pref-notif-${key}`">{{ t(`userSettings.notifications.${key}`) }}</label>
                    </div>
                    <AppSwitch :id="`pref-notif-${key}`" v-model="draft[key]" />
                </div>
            </div>
            <div class="su-field">
                <span class="su-field__label">{{ t('userSettings.notifications.pushSection') }}</span>
                <div class="su-switch-row" v-for="key in pushSwitches" :key="key">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" :for="`pref-notif-${key}`">{{ t(`userSettings.notifications.${key}`) }}</label>
                    </div>
                    <AppSwitch :id="`pref-notif-${key}`" v-model="draft[key]" />
                </div>
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-notif-digest">{{ t('userSettings.notifications.digestFrequency') }}</label>
                <AppSelect
                    id="pref-notif-digest"
                    v-model="draft.notificationDigestFrequency"
                    :items="digestItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.notifications.digestFrequency')"
                    hide-details
                />
            </div>
        </div>
    </section>
</template>
