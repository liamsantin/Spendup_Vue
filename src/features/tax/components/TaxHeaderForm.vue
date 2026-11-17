<script setup lang="ts">
/** Étape « Identité » : en-tête de la déclaration et identité des deux personnes. */
defineOptions({ name: 'TaxHeaderForm' });

import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import TaxIdentityFields from '@/features/tax/components/TaxIdentityFields.vue';
import type { TaxHeaderState } from '@/features/tax/identity';

const header = defineModel<TaxHeaderState>({ required: true });

defineProps<{
    cantonItems: { title: string; value: string }[];
    statusItems: { title: string; value: string }[];
    /** Le canton se fige dès qu'une case est remplie. */
    cantonLocked: boolean;
}>();

const emit = defineEmits<{ submit: [] }>();

const { t } = useI18n();
</script>

<template>
    <form class="tax-form" @submit.prevent="emit('submit')">
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-name">{{ t('taxPage.name') }}</label>
            <div class="tax-form__field">
                <v-text-field
                    id="tax-name"
                    v-model="header.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    maxlength="80"
                    :placeholder="t('taxPage.namePlaceholder')"
                />
            </div>
        </div>
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-status">{{ t('taxPage.status') }}</label>
            <div class="tax-form__field">
                <AppSelect id="tax-status" v-model="header.status" :items="statusItems" :label="t('taxPage.status')" hide-details="auto" />
            </div>
        </div>
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-canton">{{ t('taxPage.canton') }}</label>
            <div class="tax-form__field">
                <AppSelect
                    id="tax-canton"
                    v-model="header.canton"
                    :items="cantonItems"
                    :label="t('taxPage.canton')"
                    :disabled="cantonLocked"
                    hide-details="auto"
                />
            </div>
        </div>
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-couple">{{ t('taxPage.couple') }}</label>
            <div class="tax-form__field">
                <AppSwitch id="tax-couple" v-model="header.couple" />
            </div>
        </div>
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-taxpayer">{{ t('taxPage.taxpayerNumber') }}</label>
            <div class="tax-form__field">
                <v-text-field
                    id="tax-taxpayer"
                    v-model="header.taxpayerNumber"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    maxlength="40"
                />
            </div>
        </div>
        <div class="tax-form__row">
            <label class="tax-form__label" for="tax-notes">{{ t('taxPage.notes') }}</label>
            <div class="tax-form__field tax-form__field--wide">
                <v-textarea
                    id="tax-notes"
                    v-model="header.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="2"
                    maxlength="4000"
                    auto-grow
                />
            </div>
        </div>

        <h2 class="tax-form__legend">{{ t('taxPage.persons.1') }}</h2>
        <TaxIdentityFields v-model="header.person1" id-prefix="tax-p1" />

        <template v-if="header.couple">
            <h2 class="tax-form__legend">{{ t('taxPage.persons.2') }}</h2>
            <TaxIdentityFields v-model="header.person2" id-prefix="tax-p2" />
        </template>
    </form>
</template>
