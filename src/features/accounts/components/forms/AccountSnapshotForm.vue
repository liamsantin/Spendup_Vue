<script setup lang="ts">
/**
 * Champs d’ajout d’un relevé de solde. Indépendant du shell modal.
 * `form` est un objet réactif détenu par le parent ; la mutation des champs est intentionnelle.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'AccountSnapshotForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import { todayYmd } from '@/features/accounts/format';
import type { CreateBalanceSnapshotPayload } from '@/features/accounts/types';

const props = defineProps<{
    form: CreateBalanceSnapshotPayload;
}>();

const { t } = useI18n();

const maxSnapshotDate = todayYmd();

const snapshotAtModel = computed({
    get: () => props.form.snapshotAt || null,
    set: (value: string | null) => {
        props.form.snapshotAt = value ?? todayYmd();
    }
});
</script>

<template>
    <div>
        <v-text-field
            v-model.number="form.balance"
            :label="t('comptesPage.snapshots.fields.balance')"
            type="number"
            step="0.01"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details="auto"
        />
        <div class="mb-3">
            <AppDatePicker
                v-model="snapshotAtModel"
                :label="t('comptesPage.snapshots.fields.snapshotAt')"
                :max="maxSnapshotDate"
                color="primary"
                hide-details
                :clearable="false"
            />
        </div>
        <v-text-field
            v-model="form.note"
            :label="t('comptesPage.snapshots.fields.note')"
            variant="outlined"
            density="comfortable"
            maxlength="255"
            hide-details="auto"
        />
    </div>
</template>
