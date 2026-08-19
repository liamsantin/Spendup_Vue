<script setup lang="ts">
/**
 * Champs d’ajout d’un relevé de solde. Indépendant du shell modal.
 */
defineOptions({ name: 'AccountSnapshotForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import type { CreateBalanceSnapshotPayload } from '../types';

const props = defineProps<{
    form: CreateBalanceSnapshotPayload;
}>();

const { t } = useI18n();

function todayYmd(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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
                :max="todayYmd()"
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
