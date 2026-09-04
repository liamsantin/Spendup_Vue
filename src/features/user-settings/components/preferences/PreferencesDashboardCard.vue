<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LayoutDashboardIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
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
    <AppGlassCard :title="t('userSettings.dashboard.title')" :subtitle="t('userSettings.dashboard.subtitle')">
        <template #icon>
            <LayoutDashboardIcon :size="20" stroke-width="1.5" />
        </template>
        <v-row dense>
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
    </AppGlassCard>
</template>
