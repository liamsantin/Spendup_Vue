<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon, PlusIcon, Receipt2Icon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatAccountBalance, formatSnapshotDate } from '../../format';
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

const isMatched = computed(() => balanceDiff.value !== null && Math.abs(balanceDiff.value) < 0.005);

const diffColor = computed(() => {
    if (balanceDiff.value === null) return 'medium-emphasis';
    if (isMatched.value) return 'success';
    return balanceDiff.value < 0 ? 'error' : 'warning';
});

function formatDate(value: string) {
    return formatSnapshotDate(value, locale.value);
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
        <div class="snapshots-panel__header d-flex align-center justify-space-between ga-3 flex-wrap mb-4">
            <div class="min-width-0">
                <h5 class="text-h6 mb-0">{{ t('comptesPage.snapshots.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.snapshots.subtitle') }}</div>
            </div>
            <v-btn v-if="canWrite" color="primary" variant="tonal" size="small" @click="addOpen = true">
                <PlusIcon size="16" class="mr-1" />
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

            <div v-if="latestSnapshot" class="snapshots-summary mb-4">
                <div class="snapshots-summary__status mb-3">
                    <v-chip size="small" :color="isMatched ? 'success' : diffColor" variant="tonal">
                        {{ isMatched ? t('comptesPage.snapshots.matched') : t('comptesPage.snapshots.mismatch') }}
                    </v-chip>
                </div>

                <div class="snapshots-summary__grid">
                    <div class="snapshots-summary__metric">
                        <div class="text-caption text-medium-emphasis mb-1">{{ t('comptesPage.snapshots.latestDeclared') }}</div>
                        <div class="text-h6 font-weight-bold mb-1">
                            {{ formatAccountBalance(latestSnapshot.balance, account.currency, locale) }}
                        </div>
                        <div class="d-flex align-center ga-1 text-body-2 text-medium-emphasis">
                            <CalendarIcon size="14" stroke-width="1.5" />
                            <span>{{ formatDate(latestSnapshot.snapshotAt) }}</span>
                        </div>
                    </div>

                    <div v-if="balanceDiff !== null" class="snapshots-summary__metric snapshots-summary__metric--diff">
                        <div class="text-caption text-medium-emphasis mb-1">{{ t('comptesPage.snapshots.diffShort') }}</div>
                        <div :class="`text-h6 font-weight-bold text-${diffColor}`">
                            <template v-if="isMatched">
                                {{ formatAccountBalance(0, account.currency, locale) }}
                            </template>
                            <template v-else>
                                {{ balanceDiff >= 0 ? '+' : ''
                                }}{{ formatAccountBalance(balanceDiff, account.currency, locale) }}
                            </template>
                        </div>
                        <div class="text-body-2 text-medium-emphasis mt-1">{{ t('comptesPage.snapshots.diff') }}</div>
                    </div>
                </div>
            </div>

            <div v-if="store.loadingSnapshots && !store.balanceSnapshots.length" class="py-8 text-center">
                <v-progress-circular indeterminate color="primary" size="28" />
            </div>

            <div v-else-if="!store.balanceSnapshots.length" class="snapshots-empty text-center py-8 px-4">
                <v-avatar size="48" rounded="md" color="lightprimary" class="mb-3">
                    <Receipt2Icon class="text-primary" size="24" stroke-width="1.5" />
                </v-avatar>
                <div class="text-subtitle-1 font-weight-medium mb-1">{{ t('comptesPage.snapshots.empty') }}</div>
                <div class="text-body-2 text-medium-emphasis mb-4">{{ t('comptesPage.snapshots.emptyHint') }}</div>
                <v-btn v-if="canWrite" color="primary" variant="flat" size="small" @click="addOpen = true">
                    <PlusIcon size="16" class="mr-1" />
                    {{ t('comptesPage.snapshots.add') }}
                </v-btn>
            </div>

            <template v-else>
                <div class="text-subtitle-2 text-medium-emphasis mb-2">{{ t('comptesPage.snapshots.history') }}</div>
                <div class="snapshots-list">
                    <div v-for="snapshot in store.balanceSnapshots" :key="snapshot.publicId" class="snapshots-list__item">
                        <v-avatar size="40" rounded="md" color="lightprimary" class="flex-shrink-0">
                            <Receipt2Icon class="text-primary" size="20" stroke-width="1.5" />
                        </v-avatar>

                        <div class="snapshots-list__body min-width-0">
                            <div class="d-flex align-center justify-space-between ga-2">
                                <div class="text-subtitle-1 font-weight-bold text-truncate">
                                    {{ formatAccountBalance(snapshot.balance, account.currency, locale) }}
                                </div>
                                <div class="d-flex align-center ga-1 flex-shrink-0">
                                    <v-chip size="x-small" variant="tonal" color="primary">
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
                            <div class="d-flex align-center ga-1 text-body-2 text-medium-emphasis mt-1">
                                <CalendarIcon size="14" stroke-width="1.5" />
                                <span>{{ formatDate(snapshot.snapshotAt) }}</span>
                            </div>
                            <div v-if="snapshot.note" class="text-body-2 text-medium-emphasis text-truncate mt-1">
                                {{ snapshot.note }}
                            </div>
                        </div>
                    </div>
                </div>
            </template>
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

.snapshots-summary {
    padding: 16px;
    border-radius: 12px;
    background: rgba(var(--v-theme-lightprimary), 0.55);
    border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.snapshots-summary__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 480px) {
    .snapshots-summary__grid {
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .snapshots-summary__metric--diff {
        padding-inline-start: 20px;
        border-inline-start: 1px solid rgba(var(--v-theme-primary), 0.12);
    }
}

.snapshots-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.snapshots-list__item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.snapshots-list__body {
    flex: 1 1 auto;
    min-width: 0;
}

.snapshots-empty {
    border-radius: 12px;
    border: 1px dashed rgba(var(--v-theme-on-surface), 0.14);
    background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
