<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatAccountBalance } from '../../format';
import { useAccountsStore } from '../../stores/accounts-store';
import type { Account, AccountBalanceSnapshot } from '../../types';
import AccountSnapshotAddModal from '../modals/AccountSnapshotAddModal.vue';

const props = defineProps<{
    account: Account;
    canWrite: boolean;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const addOpen = ref(false);
const deleteTarget = ref<AccountBalanceSnapshot | null>(null);
const localError = ref<string | null>(null);

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
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium' }).format(new Date(value));
}

watch(
    () => props.account.publicId,
    (id) => {
        if (id) void store.loadBalanceSnapshots(id).catch(() => undefined);
    },
    { immediate: true }
);

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
    <div class="snapshots-panel">
        <div class="snapshots-panel__header d-flex align-center justify-space-between ga-3 flex-wrap mb-3">
            <div>
                <h5 class="text-h6 mb-0">{{ t('comptesPage.snapshots.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.snapshots.subtitle') }}</div>
            </div>
            <v-btn v-if="canWrite" color="primary" variant="tonal" size="small" @click="addOpen = true">
                {{ t('comptesPage.snapshots.add') }}
            </v-btn>
        </div>

        <AppModalPanelScroll>
            <AppAlert
                v-if="localError || store.error"
                color="error"
                variant="tonal"
                class="mb-3"
                closable
                :dismiss-ms="3000"
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
                        <div class="text-body-2 text-medium-emphasis">{{ formatDate(latestSnapshot.snapshotAt) }}</div>
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
                <v-list-item v-for="snapshot in store.balanceSnapshots" :key="snapshot.publicId" class="px-2 py-2" rounded="md">
                    <div class="d-flex align-center justify-space-between ga-2 w-100 flex-wrap">
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
                                :aria-label="t('comptesPage.snapshots.deleteModal.confirm')"
                                @click="deleteTarget = snapshot"
                            >
                                <TrashIcon size="18" />
                            </v-btn>
                        </div>
                    </div>
                </v-list-item>
            </v-list>
        </AppModalPanelScroll>

        <AccountSnapshotAddModal v-model="addOpen" :account-public-id="account.publicId" @error="localError = $event" />

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

<style scoped>
.snapshots-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.snapshots-panel__header {
    flex-shrink: 0;
}
</style>
