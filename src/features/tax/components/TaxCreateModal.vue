<script setup lang="ts">
/** Fenêtre de création d'une déclaration vide : année, canton, nom, couple et identité. */
defineOptions({ name: 'TaxCreateModal' });

import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { useCantonItems } from '@/features/tax/cantons';
import TaxIdentityFields from '@/features/tax/components/TaxIdentityFields.vue';
import { cleanIdentity, emptyIdentity } from '@/features/tax/identity';
import type { TaxIdentity } from '@/features/tax/types';

export interface TaxCreatePayload {
    year: number;
    canton: string;
    name: string | null;
    couple: boolean;
    person1: TaxIdentity;
    person2: TaxIdentity | null;
}

const open = defineModel<boolean>({ required: true });

const props = defineProps<{
    saving: boolean;
    error: string;
    /** Canton proposé à l'ouverture. */
    defaultCanton: string;
}>();

const emit = defineEmits<{ submit: [payload: TaxCreatePayload] }>();

const { t } = useI18n();
const cantonItems = useCantonItems();

const year = ref(new Date().getFullYear());
const canton = ref(props.defaultCanton);
const name = ref('');
const couple = ref(false);
const person1 = ref<TaxIdentity>(emptyIdentity());
const person2 = ref<TaxIdentity>(emptyIdentity());

// Chaque ouverture repart d'un formulaire neuf.
watch(open, (isOpen) => {
    if (!isOpen) return;
    year.value = new Date().getFullYear();
    canton.value = props.defaultCanton;
    name.value = '';
    couple.value = false;
    person1.value = emptyIdentity();
    person2.value = emptyIdentity();
});

function submit() {
    emit('submit', {
        year: year.value,
        canton: canton.value,
        name: name.value.trim() || null,
        couple: couple.value,
        person1: cleanIdentity(person1.value),
        person2: couple.value ? cleanIdentity(person2.value) : null
    });
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('taxPage.createModal.title')"
        :subtitle="t('taxPage.createModal.subtitle')"
        :max-width="560"
        :height="640"
        scrollable
        mobile-layout="fullscreen"
    >
        <form id="tax-create-form" class="tax-form tax-form--modal" @submit.prevent="submit">
            <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-name">{{ t('taxPage.name') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-create-name"
                        v-model="name"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="80"
                        :placeholder="t('taxPage.namePlaceholder')"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-year">{{ t('taxPage.year') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-create-year"
                        v-model.number="year"
                        type="number"
                        min="2000"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-canton">{{ t('taxPage.canton') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-create-canton"
                        v-model="canton"
                        :items="cantonItems"
                        :label="t('taxPage.canton')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-couple">{{ t('taxPage.couple') }}</label>
                <div class="tax-form__field">
                    <AppSwitch id="tax-create-couple" v-model="couple" />
                </div>
            </div>

            <h3 class="tax-form__legend">{{ t('taxPage.createModal.person1') }}</h3>
            <TaxIdentityFields v-model="person1" id-prefix="tax-create-p1" :fields="['officialName', 'firstName', 'municipality', 'job']" />

            <template v-if="couple">
                <h3 class="tax-form__legend">{{ t('taxPage.createModal.person2') }}</h3>
                <TaxIdentityFields v-model="person2" id-prefix="tax-create-p2" :fields="['officialName', 'firstName']" />
            </template>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                {{ t('taxPage.cancel') }}
            </button>
            <button type="submit" form="tax-create-form" class="su-btn su-btn--ink" :disabled="saving">
                {{ t('taxPage.create') }}
            </button>
        </template>
    </AppModalBase>
</template>
