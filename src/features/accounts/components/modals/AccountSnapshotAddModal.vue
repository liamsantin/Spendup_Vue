<script setup lang="ts">
defineOptions({ name: 'AccountSnapshotAddModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { parseAccountAmount, todayYmd, ymdToSnapshotIso } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { CreateBalanceSnapshotPayload } from '@/features/accounts/types';
import AccountSnapshotForm from '@/features/accounts/components/forms/AccountSnapshotForm.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

type SnapshotFormModel = {
    balance: number;
    snapshotAt: string;
    note: string;
};

function emptyForm(): SnapshotFormModel {
    return {
        balance: 0,
        snapshotAt: todayYmd(),
        note: ''
    };
}

const form = ref<SnapshotFormModel>(emptyForm());
const localError = ref<string | null>(null);
const balanceError = ref<string | null>(null);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            form.value = emptyForm();
            localError.value = null;
            balanceError.value = null;
        }
    }
);

async function submitAdd() {
    localError.value = null;
    balanceError.value = null;
    const balance = parseAccountAmount(form.value.balance);
    if (balance == null) {
        balanceError.value = t('comptesPage.snapshots.errors.balanceInvalid');
        return;
    }
    try {
        const payload: CreateBalanceSnapshotPayload = {
            balance,
            snapshotAt: ymdToSnapshotIso(form.value.snapshotAt),
            note: form.value.note.trim() || null
        };
        await store.createBalanceSnapshot(props.accountPublicId, payload);
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('comptesPage.snapshots.addTitle')"
        :subtitle="t('comptesPage.snapshots.addSubtitle')"
        :max-width="480"
        :height="smAndDown ? 460 : undefined"
        :fixed-height="smAndDown"
        :scrollable="false"
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError" type="error" class="mb-3" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <AccountSnapshotForm :form="form" :balance-error="balanceError" />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="submitAdd">
                {{ t('comptesPage.snapshots.add') }}
            </button>
        </template>
    </AppModalBase>
</template>
