<script setup lang="ts">
defineOptions({ name: 'AccountSnapshotAddModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { parseAccountAmount, snapshotAtForUpdate, snapshotIsoToYmd, todayYmd, ymdToSnapshotIso } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { AccountBalanceSnapshot, CreateBalanceSnapshotPayload, UpdateBalanceSnapshotPayload } from '@/features/accounts/types';
import AccountSnapshotForm from '@/features/accounts/components/forms/AccountSnapshotForm.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string;
    snapshot?: AccountBalanceSnapshot | null;
    canRestore?: boolean;
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

function formFromSnapshot(snapshot: AccountBalanceSnapshot): SnapshotFormModel {
    return {
        balance: snapshot.balance,
        snapshotAt: snapshotIsoToYmd(snapshot.snapshotAt),
        note: snapshot.note ?? ''
    };
}

const isEdit = ref(false);
const editSnapshot = ref<AccountBalanceSnapshot | null>(null);
const form = ref<SnapshotFormModel>(emptyForm());
const localError = ref<string | null>(null);
const balanceError = ref<string | null>(null);
const archivedBlocked = ref(false);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            isEdit.value = !!props.snapshot;
            editSnapshot.value = props.snapshot ?? null;
            form.value = editSnapshot.value ? formFromSnapshot(editSnapshot.value) : emptyForm();
            localError.value = null;
            balanceError.value = null;
            archivedBlocked.value = false;
        }
    }
);

function isArchivedAccountError(err: AppError) {
    return err.status === 400 && /archiv/i.test(err.message);
}

async function submit() {
    if (archivedBlocked.value) return;
    localError.value = null;
    balanceError.value = null;
    const balance = parseAccountAmount(form.value.balance);
    if (balance == null) {
        balanceError.value = t('comptesPage.snapshots.errors.balanceInvalid');
        return;
    }
    if (form.value.note.length > 255) {
        localError.value = t('comptesPage.snapshots.errors.noteTooLong');
        return;
    }
    const note = form.value.note.trim() || null;
    try {
        if (isEdit.value && editSnapshot.value) {
            const payload: UpdateBalanceSnapshotPayload = {
                balance,
                snapshotAt: snapshotAtForUpdate(form.value.snapshotAt, editSnapshot.value.snapshotAt),
                note
            };
            await store.updateBalanceSnapshot(props.accountPublicId, editSnapshot.value.publicId, payload);
        } else {
            const payload: CreateBalanceSnapshotPayload = {
                balance,
                snapshotAt: ymdToSnapshotIso(form.value.snapshotAt),
                note
            };
            await store.createBalanceSnapshot(props.accountPublicId, payload);
        }
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('comptesPage.snapshots.errors.notFound');
            open.value = false;
            return;
        }
        if (isArchivedAccountError(err)) {
            archivedBlocked.value = true;
            localError.value = t('comptesPage.snapshots.errors.archived');
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function restoreThenContinue() {
    localError.value = null;
    try {
        await store.restoreAccount(props.accountPublicId);
        archivedBlocked.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('comptesPage.snapshots.editTitle') : t('comptesPage.snapshots.addTitle')"
        :subtitle="isEdit ? t('comptesPage.snapshots.editSubtitle') : t('comptesPage.snapshots.addSubtitle')"
        :max-width="480"
        :height="smAndDown ? 460 : undefined"
        :fixed-height="smAndDown"
        :scrollable="false"
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError" type="error" class="mb-3" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <button
            v-if="archivedBlocked && canRestore"
            type="button"
            class="su-btn su-btn--ink mb-3"
            :disabled="store.acting"
            @click="restoreThenContinue"
        >
            {{ t('comptesPage.actions.restore') }}
        </button>

        <AccountSnapshotForm :form="form" :balance-error="balanceError" />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || archivedBlocked" @click="submit">
                {{ isEdit ? t('common.save') : t('comptesPage.snapshots.add') }}
            </button>
        </template>
    </AppModalBase>
</template>
