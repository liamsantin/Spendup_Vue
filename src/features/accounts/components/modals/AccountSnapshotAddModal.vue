<script setup lang="ts">
defineOptions({ name: 'AccountSnapshotAddModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
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
    error: [message: string];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

function emptyForm(): CreateBalanceSnapshotPayload {
    return {
        balance: 0,
        snapshotAt: todayYmd(),
        note: null
    };
}

const form = ref<CreateBalanceSnapshotPayload>(emptyForm());

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) form.value = emptyForm();
    }
);

async function submitAdd() {
    const balance = parseAccountAmount(form.value.balance);
    if (balance == null) {
        emit('error', t('comptesPage.snapshots.errors.balanceInvalid'));
        return;
    }
    try {
        // `source` est ignoré par l’API (toujours "manual") — ne pas l’envoyer.
        const payload: CreateBalanceSnapshotPayload = {
            balance,
            snapshotAt: ymdToSnapshotIso(form.value.snapshotAt),
            note: form.value.note?.trim() || null
        };
        await store.createBalanceSnapshot(props.accountPublicId, payload);
        open.value = false;
    } catch (e: unknown) {
        emit('error', getErrorMessage(e));
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
        <AccountSnapshotForm :form="form" />

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting" @click="submitAdd">
                {{ t('comptesPage.snapshots.add') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
