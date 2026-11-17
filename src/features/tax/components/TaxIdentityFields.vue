<script setup lang="ts">
/** Champs d'identité d'une personne (nom, prénom, n° AVS, commune, profession). */
defineOptions({ name: 'TaxIdentityFields' });

import { useI18n } from 'vue-i18n';
import type { TaxIdentity } from '@/features/tax/types';
import { isCipher } from '@/features/vault/crypto';

type IdentityField = keyof TaxIdentity;

const identity = defineModel<TaxIdentity>({ required: true });

withDefaults(
    defineProps<{
        /** Préfixe des `id` (ex. `tax-p1` donne `tax-p1-name`). */
        idPrefix: string;
        fields?: IdentityField[];
    }>(),
    { fields: () => ['officialName', 'firstName', 'vn', 'municipality', 'job'] }
);

const { t } = useI18n();

const META: Record<IdentityField, { suffix: string; label: string; maxlength: number }> = {
    officialName: { suffix: 'name', label: 'taxPage.officialName', maxlength: 100 },
    firstName: { suffix: 'first', label: 'taxPage.firstName', maxlength: 100 },
    vn: { suffix: 'vn', label: 'taxPage.vn', maxlength: 16 },
    municipality: { suffix: 'city', label: 'taxPage.municipality', maxlength: 100 },
    job: { suffix: 'job', label: 'taxPage.job', maxlength: 100 }
};
</script>

<template>
    <div v-for="field in fields" :key="field" class="tax-form__row">
        <label class="tax-form__label" :for="`${idPrefix}-${META[field].suffix}`">{{ t(META[field].label) }}</label>
        <div class="tax-form__field">
            <!-- chiffré par le Coffre mais illisible (Coffre fermé) : affiché verrouillé, renvoyé tel quel -->
            <v-text-field
                v-if="isCipher(identity[field])"
                :id="`${idPrefix}-${META[field].suffix}`"
                :model-value="`🔒 ${t('vault.unreadable')}`"
                variant="outlined"
                hide-details="auto"
                disabled
            />
            <v-text-field
                v-else
                :id="`${idPrefix}-${META[field].suffix}`"
                v-model="identity[field]"
                color="primary"
                variant="outlined"
                hide-details="auto"
                :maxlength="META[field].maxlength"
            />
        </div>
    </div>
</template>
