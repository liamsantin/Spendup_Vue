<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { WorldIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, TIMEZONE_OPTIONS, type UserSettings } from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const localeItems = computed(() => LOCALE_OPTIONS.map((item) => ({ title: t(item.labelKey), value: item.value })));
const currencyItems = computed(() => CURRENCY_OPTIONS.map((value) => ({ title: value, value })));
const firstDayItems = computed(() =>
    [0, 1, 2, 3, 4, 5, 6].map((value) => ({
        title: t(`userSettings.regional.firstDay.${value}`),
        value
    }))
);
</script>

<template>
    <AppGlassCard :title="t('userSettings.regional.title')" :subtitle="t('userSettings.regional.subtitle')">
        <template #icon>
            <WorldIcon :size="20" stroke-width="1.5" />
        </template>
        <v-row dense>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.locale') }}</v-label>
                <v-select
                    v-model="draft.locale"
                    :items="localeItems"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    hide-details
                />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.timezone') }}</v-label>
                <v-select v-model="draft.timezone" :items="TIMEZONE_OPTIONS" variant="outlined" hide-details />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.defaultCurrency') }}</v-label>
                <v-select
                    v-model="draft.defaultCurrency"
                    :items="currencyItems"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    hide-details
                />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.firstDayOfWeek') }}</v-label>
                <v-select
                    v-model="draft.firstDayOfWeek"
                    :items="firstDayItems"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    hide-details
                />
            </v-col>
        </v-row>
    </AppGlassCard>
</template>
