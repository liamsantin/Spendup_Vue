<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import type { UserSettings } from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const dashboardViewItems = computed(() => [
    { title: t('userSettings.dashboard.views.overview'), value: 'overview' },
    { title: t('userSettings.dashboard.views.budget'), value: 'budget' },
    { title: t('userSettings.dashboard.views.transactions'), value: 'transactions' }
]);
</script>

<template>
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('userSettings.dashboard.title') }}</h2>
            <p>{{ t('userSettings.dashboard.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="su-field">
                <label class="su-field__label" for="pref-dashboard-view">{{ t('userSettings.dashboard.defaultView') }}</label>
                <AppSelect
                    id="pref-dashboard-view"
                    v-model="draft.defaultDashboardView"
                    :items="dashboardViewItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.dashboard.defaultView')"
                    hide-details
                />
            </div>
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="pref-show-balance">{{ t('userSettings.dashboard.showBalance') }}</label>
                    </div>
                    <AppSwitch id="pref-show-balance" v-model="draft.showBalanceOnDashboard" />
                </div>
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="pref-hide-sensitive">{{
                            t('userSettings.dashboard.hideSensitiveAmounts')
                        }}</label>
                    </div>
                    <AppSwitch id="pref-hide-sensitive" v-model="draft.hideSensitiveAmounts" />
                </div>
            </div>
        </div>
    </section>
</template>
