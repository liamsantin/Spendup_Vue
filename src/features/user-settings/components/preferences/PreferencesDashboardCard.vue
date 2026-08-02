<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LayoutDashboardIcon } from 'vue-tabler-icons';
import type { UserSettings } from '../../types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const dashboardViewItems = computed(() => [
    { title: t('userSettings.dashboard.views.overview'), value: 'overview' },
    { title: t('userSettings.dashboard.views.budget'), value: 'budget' },
    { title: t('userSettings.dashboard.views.transactions'), value: 'transactions' }
]);
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <LayoutDashboardIcon class="text-primary" size="25" />
                </v-avatar>
                <div>
                    <h4 class="text-h4 mb-0">{{ t('userSettings.dashboard.title') }}</h4>
                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                        {{ t('userSettings.dashboard.subtitle') }}
                    </div>
                </div>
            </div>
            <v-row dense class="mt-4">
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('userSettings.dashboard.defaultView') }}</v-label>
                    <v-select
                        v-model="draft.defaultDashboardView"
                        :items="dashboardViewItems"
                        item-title="title"
                        item-value="value"
                        variant="outlined"
                        hide-details
                    />
                </v-col>
                <v-col cols="12" md="6" class="d-flex flex-column justify-center">
                    <v-switch
                        v-model="draft.showBalanceOnDashboard"
                        color="primary"
                        hide-details
                        class="mb-2"
                        :label="t('userSettings.dashboard.showBalance')"
                    />
                    <v-switch
                        v-model="draft.hideSensitiveAmounts"
                        color="primary"
                        hide-details
                        :label="t('userSettings.dashboard.hideSensitiveAmounts')"
                    />
                </v-col>
            </v-row>
        </v-card-item>
    </v-card>
</template>
