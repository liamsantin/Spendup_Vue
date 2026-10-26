<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
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
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('userSettings.regional.title') }}</h2>
            <p>{{ t('userSettings.regional.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="su-field">
                <label class="su-field__label" for="pref-locale">{{ t('userSettings.regional.locale') }}</label>
                <AppSelect
                    id="pref-locale"
                    v-model="draft.locale"
                    :items="localeItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.regional.locale')"
                    hide-details
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-timezone">{{ t('userSettings.regional.timezone') }}</label>
                <AppSelect
                    id="pref-timezone"
                    v-model="draft.timezone"
                    :items="TIMEZONE_OPTIONS"
                    :label="t('userSettings.regional.timezone')"
                    hide-details
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-currency">{{ t('userSettings.regional.defaultCurrency') }}</label>
                <AppSelect
                    id="pref-currency"
                    v-model="draft.defaultCurrency"
                    :items="currencyItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.regional.defaultCurrency')"
                    hide-details
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-first-day">{{ t('userSettings.regional.firstDayOfWeek') }}</label>
                <AppSelect
                    id="pref-first-day"
                    v-model="draft.firstDayOfWeek"
                    :items="firstDayItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.regional.firstDayOfWeek')"
                    hide-details
                />
            </div>
        </div>
    </section>
</template>
