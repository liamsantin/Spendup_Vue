<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import type { Country } from '@/features/countries';

defineProps<{
    loading: boolean;
    countries: Country[];
    countriesLoading: boolean;
    countriesError?: string | null;
    publicId: string;
    error: string | null;
    birthDateMax: string;
}>();

const emit = defineEmits<{
    copyPublicId: [];
    dismissError: [];
}>();

const firstName = defineModel<string>('firstName', { required: true });
const name = defineModel<string>('name', { required: true });
const phone = defineModel<string>('phone', { required: true });
const birthDate = defineModel<string>('birthDate', { required: true });
const street = defineModel<string>('street', { required: true });
const streetNumber = defineModel<string>('streetNumber', { required: true });
const countryId = defineModel<number | null>('countryId', { required: true });
const { t } = useI18n();

const birthDateModel = computed({
    get: () => birthDate.value || null,
    set: (value: string | null) => {
        birthDate.value = value ?? '';
    }
});
</script>

<template>
    <section class="su-settings account-personal">
        <div class="su-settings__lead">
            <h2>{{ t('accounts.personal.title') }}</h2>
            <p>{{ t('accounts.personal.hint') }}</p>
            <!-- Identifiant public en mono, copie au clic. -->
            <button
                v-if="publicId !== '—'"
                type="button"
                class="account-personal__id"
                :title="t('common.copy')"
                @click="emit('copyPublicId')"
            >
                ID #{{ publicId }}
            </button>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="error" type="error" class="is-full su-alert" closable @dismiss="emit('dismissError')">
                {{ error }}
            </AppAlert>
            <div class="su-field">
                <label class="su-field__label" for="account-first-name">{{ t('accounts.personal.fields.firstName') }}</label>
                <v-text-field
                    id="account-first-name"
                    v-model="firstName"
                    color="primary"
                    variant="outlined"
                    hide-details
                    :disabled="loading"
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-name">{{ t('accounts.personal.fields.name') }}</label>
                <v-text-field id="account-name" v-model="name" color="primary" variant="outlined" hide-details :disabled="loading" />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-phone">{{ t('accounts.personal.fields.phone') }}</label>
                <v-text-field
                    id="account-phone"
                    v-model="phone"
                    color="primary"
                    variant="outlined"
                    type="tel"
                    hide-details
                    :disabled="loading"
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-birth-date">{{ t('accounts.personal.fields.birthDate') }}</label>
                <AppDatePicker
                    id="account-birth-date"
                    v-model="birthDateModel"
                    :max="birthDateMax"
                    color="primary"
                    hide-details
                    :disabled="loading"
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-street">{{ t('accounts.personal.fields.street') }}</label>
                <v-text-field id="account-street" v-model="street" color="primary" variant="outlined" hide-details :disabled="loading" />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-street-number">{{ t('accounts.personal.fields.streetNumber') }}</label>
                <v-text-field
                    id="account-street-number"
                    v-model="streetNumber"
                    color="primary"
                    variant="outlined"
                    hide-details
                    :disabled="loading"
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="account-country">{{ t('accounts.personal.fields.country') }}</label>
                <AppAlert v-if="countriesError" type="error" class="mb-2">
                    {{ countriesError }}
                </AppAlert>
                <v-autocomplete
                    id="account-country"
                    v-model="countryId"
                    :items="countries"
                    item-title="name"
                    item-value="id"
                    color="primary"
                    variant="outlined"
                    hide-details
                    clearable
                    auto-select-first
                    :loading="countriesLoading"
                    :disabled="loading || (countriesLoading && !countries.length)"
                    :no-data-text="countriesError ? t('accounts.personal.countriesLoadFailed') : t('accounts.personal.noCountries')"
                />
            </div>
        </div>
    </section>
</template>

<style scoped>
.account-personal__id {
    appearance: none;
    display: inline-block;
    margin: 12px 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gray);
    font-family: var(--font-mono);
    font-size: 13px;
    cursor: pointer;
    user-select: none;
}

.account-personal__id:hover {
    color: var(--ink);
}

.account-personal__id:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}
</style>
