<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { TrashIcon } from 'vue-tabler-icons';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatAccountBalance } from '../format';
import { useAccountsStore } from '../stores/accounts-store';
import type { Account, AccountBalanceSnapshot, CreateBalanceSnapshotPayload } from '../types';

const props = defineProps<{
    account: Account;
    canWrite: boolean;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const addOpen = ref(false);
const deleteTarget = ref<AccountBalanceSnapshot | null>(null);
const localError = ref<string | null>(null);

const form = ref<CreateBalanceSnapshotPayload>({
    balance: 0,
    snapshotAt: new Date().toISOString().slice(0, 16),
    source: 'manual',
    note: null
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (v: boolean) => {
        if (!v) deleteTarget.value = null;
    }
});

const latestSnapshot = computed(() => store.balanceSnapshots[0] ?? null);

const balanceDiff = computed(() => {
    if (!latestSnapshot.value) return null;
    return props.account.currentBalance - latestSnapshot.value.balance;
});

const diffColor = computed(() => {
    if (balanceDiff.value === null) return 'medium-emphasis';
    if (Math.abs(balanceDiff.value) < 0.005) return 'success';
    return 'warning';
});

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatSnapshotDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function resetForm() {
    form.value = {
        balance: 0,
        snapshotAt: new Date().toISOString().slice(0, 16),
        source: 'manual',
        note: null
    };
}

function openAdd() {
    resetForm();
    addOpen.value = true;
}

watch(
    () => props.account.publicId,
    (id) => {
        if (id) void store.loadBalanceSnapshots(id).catch(() => undefined);
    },
    { immediate: true }
);

async function submitAdd() {
    localError.value = null;
    try {
        const payload: CreateBalanceSnapshotPayload = {
            balance: Number(form.value.balance),
            snapshotAt: new Date(form.value.snapshotAt).toISOString(),
            source: form.value.source ?? 'manual',
            note: form.value.note?.trim() || null
        };
        await store.createBalanceSnapshot(props.account.publicId, payload);
        addOpen.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteBalanceSnapshot(props.account.publicId, deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div>
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-3">
            <div>
                <h5 class="text-h6 mb-0">{{ t('comptesPage.snapshots.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.snapshots.subtitle') }}</div>
            </div>
            <v-btn v-if="canWrite" color="primary" variant="tonal" size="small" @click="openAdd">
                {{ t('comptesPage.snapshots.add') }}
            </v-btn>
        </div>

        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="mb-3"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="latestSnapshot" class="mb-4 pa-3 rounded-lg bg-surface-variant">
            <div class="d-flex align-start justify-space-between ga-2 flex-wrap">
                <div>
                    <div class="text-body-2 text-medium-emphasis mb-1">{{ t('comptesPage.snapshots.latestDeclared') }}</div>
                    <div class="text-h6 font-weight-bold">
                        {{ formatAccountBalance(latestSnapshot.balance, account.currency, locale) }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis">{{ formatSnapshotDate(latestSnapshot.snapshotAt) }}</div>
                </div>
                <div v-if="balanceDiff !== null" class="text-right">
                    <div class="text-body-2 text-medium-emphasis mb-1">{{ t('comptesPage.snapshots.diff') }}</div>
                    <div :class="`text-subtitle-1 font-weight-bold text-${diffColor}`">
                        {{ balanceDiff >= 0 ? '+' : '' }}{{ formatAccountBalance(balanceDiff, account.currency, locale) }}
                    </div>
                </div>
            </div>
        </div>

        <div v-if="store.loadingSnapshots && !store.balanceSnapshots.length" class="py-6 text-center">
            <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <div v-else-if="!store.balanceSnapshots.length" class="py-4 text-center text-medium-emphasis text-body-2">
            {{ t('comptesPage.snapshots.empty') }}
        </div>
        <v-list v-else class="py-0 theme-list">
            <v-list-item
                v-for="snapshot in store.balanceSnapshots"
                :key="snapshot.publicId"
                class="px-2 py-2"
                rounded="md"
            >
                <div class="d-flex align-center justify-space-between ga-2 w-100">
                    <div class="min-width-0">
                        <div class="text-subtitle-2 font-weight-bold">
                            {{ formatAccountBalance(snapshot.balance, account.currency, locale) }}
                        </div>
                        <div class="text-body-2 text-medium-emphasis">{{ formatDate(snapshot.snapshotAt) }}</div>
                        <div v-if="snapshot.note" class="text-body-2 text-medium-emphasis text-truncate">{{ snapshot.note }}</div>
                    </div>
                    <div class="d-flex align-center ga-2">
                        <v-chip size="x-small" variant="tonal" color="secondary">
                            {{ t(`comptesPage.snapshots.sources.${snapshot.source}`) }}
                        </v-chip>
                        <v-btn
                            v-if="canWrite"
                            size="small"
                            variant="text"
                            color="error"
                            :disabled="store.acting"
                            :icon="true"
                            @click="deleteTarget = snapshot"
                        >
                            <TrashIcon size="18" />
                        </v-btn>
                    </div>
                </div>
            </v-list-item>
        </v-list>

        <AppModalBase
            v-model="addOpen"
            :title="t('comptesPage.snapshots.addTitle')"
            :subtitle="t('comptesPage.snapshots.addSubtitle')"
            :max-width="480"
            :scrollable="false"
        >
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
            <v-text-field
                v-model="form.snapshotAt"
                :label="t('comptesPage.snapshots.fields.snapshotAt')"
                type="datetime-local"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                hide-details="auto"
            />
            <v-text-field
                v-model="form.note"
                :label="t('comptesPage.snapshots.fields.note')"
                variant="outlined"
                density="comfortable"
                maxlength="255"
                hide-details="auto"
            />

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting" @click="submitAdd">
                    {{ t('comptesPage.snapshots.add') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('comptesPage.snapshots.deleteModal.title')"
            :message="
                t('comptesPage.snapshots.deleteModal.body', {
                    balance: deleteTarget ? formatAccountBalance(deleteTarget.balance, account.currency, locale) : '',
                    date: deleteTarget ? formatDate(deleteTarget.snapshotAt) : ''
                })
            "
            :confirm-label="t('comptesPage.snapshots.deleteModal.confirm')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>
