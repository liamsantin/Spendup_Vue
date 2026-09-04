<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
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
    <AppGlassCard :title="t('accounts.personal.title')" :subtitle="t('accounts.personal.hint')">
        <template #icon>
            <UserIcon :size="20" stroke-width="1.5" />
        </template>
        <template v-if="publicId !== '—'" #actions>
            <button type="button" class="su-btn su-btn--ghost account-public-id" @click="emit('copyPublicId')">#{{ publicId }}</button>
        </template>
        <AppAlert v-if="error" type="error" class="su-alert" closable @dismiss="emit('dismissError')">
            {{ error }}
        </AppAlert>
        <div class="mt-2">
            <v-row dense>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.firstName') }}</v-label>
                    <v-text-field v-model="firstName" color="primary" variant="outlined" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.name') }}</v-label>
                    <v-text-field v-model="name" color="primary" variant="outlined" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.phone') }}</v-label>
                    <v-text-field v-model="phone" color="primary" variant="outlined" type="tel" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.birthDate') }}</v-label>
                    <AppDatePicker v-model="birthDateModel" :max="birthDateMax" color="primary" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="5">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.street') }}</v-label>
                    <v-text-field v-model="street" color="primary" variant="outlined" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="2">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.streetNumber') }}</v-label>
                    <v-text-field v-model="streetNumber" color="primary" variant="outlined" hide-details :disabled="loading" />
                </v-col>
                <v-col cols="12" md="5">
                    <v-label class="mb-2 font-weight-medium">{{ t('accounts.personal.fields.country') }}</v-label>
                    <v-alert v-if="countriesError" type="error" variant="tonal" density="compact" class="mb-2">
                        {{ countriesError }}
                    </v-alert>
                    <v-autocomplete
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
                </v-col>
            </v-row>
        </div>
    </AppGlassCard>
</template>

<style scoped>
.account-public-id {
    cursor: pointer;
    user-select: none;
}
</style>
