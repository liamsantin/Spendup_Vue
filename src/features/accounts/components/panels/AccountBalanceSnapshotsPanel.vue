<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon, PlusIcon, Receipt2Icon } from 'vue-tabler-icons';
import { useDisplay } from 'vuetify';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppAccordion from '@/components/shared/accordion/AppAccordion.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAuthStore } from '@/features/auth';
import { formatAccountBalance, formatSnapshotDate } from '@/features/accounts/format';
import { canManageShares, canRestoreAccount, isSharedAccount } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account, AccountBalanceSnapshot } from '@/features/accounts/types';
import AccountSnapshotAddModal from '@/features/accounts/components/modals/AccountSnapshotAddModal.vue';
import AccountBalanceSnapshotItem from '@/features/accounts/components/panels/AccountBalanceSnapshotItem.vue';

const props = defineProps<{
    account: Account;
    canWrite: boolean;
}>();

const { t, locale } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();
const auth = useAuthStore();

const formOpen = ref(false);
const editTarget = ref<AccountBalanceSnapshot | null>(null);
const summaryOpen = ref(false);
const deleteTarget = ref<AccountBalanceSnapshot | null>(null);
const localError = ref<string | null>(null);
const historyListRef = ref<HTMLElement | null>(null);
const historyScrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const historyScrollbarOptions = {
    ...PERFECT_SCROLLBAR_OPTIONS,
    wheelPropagation: false
};

let historyResizeObserver: ResizeObserver | null = null;

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (v: boolean) => {
        if (!v) deleteTarget.value = null;
    }
});

const latestSnapshot = computed(() => store.balanceSnapshots[0] ?? null);

const showAuthors = computed(() => isSharedAccount(props.account, store.shares));
const canRestore = computed(() => canRestoreAccount(props.account));

const balanceDiff = computed(() => {
    if (!latestSnapshot.value || props.account.currentBalance == null) return null;
    return props.account.currentBalance - latestSnapshot.value.balance;
});

const isMatched = computed(() => balanceDiff.value !== null && Math.abs(balanceDiff.value) < 0.005);

watch(
    isMatched,
    (matched) => {
        // Ouvre la synthèse si un écart est détecté (sinon reste replié pour laisser place à l’historique).
        if (latestSnapshot.value && matched === false) {
            summaryOpen.value = true;
        }
    },
    { immediate: true }
);

const diffColor = computed(() => {
    if (balanceDiff.value === null) return 'medium-emphasis';
    if (isMatched.value) return 'success';
    return balanceDiff.value < 0 ? 'error' : 'warning';
});

function formatDate(value: string) {
    return formatSnapshotDate(value, locale.value);
}

function authorLabel(snapshot: AccountBalanceSnapshot) {
    const mine = auth.user?.userPublicId;
    if (mine && snapshot.createdByUserPublicId === mine) {
        return t('comptesPage.snapshots.createdByMe');
    }
    const name = snapshot.createdByDisplayName;
    return name?.trim() ? t('comptesPage.snapshots.createdBy', { name }) : t('comptesPage.snapshots.createdByUnknown');
}

async function refreshHistoryScrollbar() {
    if (smAndDown.value) return;
    await nextTick();
    historyScrollbarRef.value?.ps?.update();
}

function bindHistoryResizeObserver() {
    historyResizeObserver?.disconnect();
    historyResizeObserver = null;
    const el = historyListRef.value;
    if (!el || smAndDown.value || typeof ResizeObserver === 'undefined') return;
    historyResizeObserver = new ResizeObserver(() => {
        historyScrollbarRef.value?.ps?.update();
    });
    historyResizeObserver.observe(el);
}

watch(
    () => props.account.publicId,
    (id) => {
        if (!id) return;
        void store.loadBalanceSnapshots(id).catch(() => undefined);
        // Owner : charger les shares pour savoir si le compte est partagé (affichage auteur).
        if (canManageShares(props.account)) {
            void store.loadShares(id).catch(() => undefined);
        }
    },
    { immediate: true }
);

watch(
    () => [smAndDown.value, store.balanceSnapshots.length, store.loadingSnapshots, summaryOpen.value] as const,
    async () => {
        await refreshHistoryScrollbar();
        bindHistoryResizeObserver();
    }
);

watch(formOpen, (open) => {
    if (!open) editTarget.value = null;
});

function openAdd() {
    editTarget.value = null;
    formOpen.value = true;
}

function openEdit(snapshot: AccountBalanceSnapshot) {
    editTarget.value = snapshot;
    formOpen.value = true;
}

/** Filet si SignalR off / event manqué : refetch à la reprise de visibilité. */
function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    const id = props.account.publicId;
    if (!id) return;
    void store.loadBalanceSnapshots(id, true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    historyResizeObserver?.disconnect();
    historyResizeObserver = null;
});

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

async function onLoadMore() {
    localError.value = null;
    try {
        await store.loadMoreBalanceSnapshots(props.account.publicId);
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
            <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="openAdd">
                <PlusIcon size="16" stroke-width="1.6" />
                {{ t('comptesPage.snapshots.add') }}
            </button>
        </div>

        <div class="snapshots-panel__body">
            <AppAlert
                v-if="localError || store.error"
                type="error"
                class="mb-3 flex-shrink-0"
                closable
                :dismiss-ms="6000"
                @dismiss="
                    localError = null;
                    store.clearError();
                "
            >
                {{ localError || store.error }}
            </AppAlert>

            <AppAccordion
                v-if="latestSnapshot"
                v-model="summaryOpen"
                class="mb-4 flex-shrink-0"
                :title="t('comptesPage.snapshots.summaryTitle')"
                :subtitle="t('comptesPage.snapshots.summarySubtitle')"
            >
                <template #extra>
                    <v-chip size="small" :color="isMatched ? 'success' : diffColor" variant="tonal">
                        {{ isMatched ? t('comptesPage.snapshots.matched') : t('comptesPage.snapshots.mismatch') }}
                    </v-chip>
                </template>

                <div class="snapshots-summary">
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
                            <div v-if="showAuthors" class="text-body-2 text-medium-emphasis mt-1">
                                {{ authorLabel(latestSnapshot) }}
                            </div>
                        </div>

                        <div v-if="balanceDiff !== null" class="snapshots-summary__metric snapshots-summary__metric--diff">
                            <div class="text-caption text-medium-emphasis mb-1">{{ t('comptesPage.snapshots.diffShort') }}</div>
                            <div :class="`text-h6 font-weight-bold text-${diffColor}`">
                                <template v-if="isMatched">
                                    {{ formatAccountBalance(0, account.currency, locale) }}
                                </template>
                                <template v-else>
                                    {{ balanceDiff >= 0 ? '+' : '' }}{{ formatAccountBalance(balanceDiff, account.currency, locale) }}
                                </template>
                            </div>
                            <div class="text-body-2 text-medium-emphasis mt-1">{{ t('comptesPage.snapshots.diff') }}</div>
                        </div>
                    </div>
                </div>
            </AppAccordion>

            <div v-if="store.loadingSnapshots && !store.balanceSnapshots.length" class="py-8 text-center flex-shrink-0">
                <span class="su-spin" />
            </div>

            <div v-else-if="!store.balanceSnapshots.length" class="snapshots-empty text-center py-8 px-4 flex-shrink-0">
                <v-avatar size="48" rounded="md" color="lightprimary" class="mb-3">
                    <Receipt2Icon class="text-primary" size="24" stroke-width="1.5" />
                </v-avatar>
                <div class="text-subtitle-1 font-weight-medium mb-1">{{ t('comptesPage.snapshots.empty') }}</div>
                <div class="text-body-2 text-medium-emphasis mb-4">{{ t('comptesPage.snapshots.emptyHint') }}</div>
                <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="openAdd">
                    <PlusIcon size="16" stroke-width="1.6" />
                    {{ t('comptesPage.snapshots.add') }}
                </button>
            </div>

            <div v-else class="snapshots-history">
                <div class="snapshots-history__title flex-shrink-0 d-flex align-center ga-2">
                    <Receipt2Icon size="16" stroke-width="1.6" class="flex-shrink-0" />
                    <span>{{ t('comptesPage.snapshots.history') }}</span>
                </div>
                <div ref="historyListRef" class="snapshots-history__list">
                    <div v-if="smAndDown" class="snapshots-history__scroll snapshots-history__scroll--native">
                        <div class="snapshots-list">
                            <AccountBalanceSnapshotItem
                                v-for="(snapshot, index) in store.balanceSnapshots"
                                :key="snapshot.publicId"
                                :snapshot="snapshot"
                                :currency="account.currency"
                                :can-write="canWrite"
                                :show-author="showAuthors"
                                :acting="store.acting"
                                :latest="index === 0"
                                @edit="openEdit"
                                @delete="deleteTarget = $event"
                            />
                            <div v-if="store.hasMoreSnapshots" class="py-3 text-center">
                                <button
                                    type="button"
                                    class="su-btn su-btn--ghost"
                                    :disabled="store.loadingMoreSnapshots"
                                    @click="onLoadMore"
                                >
                                    {{ t('comptesPage.snapshots.loadMore') }}
                                </button>
                            </div>
                        </div>
                    </div>
                    <PerfectScrollbar v-else ref="historyScrollbarRef" class="snapshots-history__scroll" :options="historyScrollbarOptions">
                        <div class="snapshots-list">
                            <AccountBalanceSnapshotItem
                                v-for="(snapshot, index) in store.balanceSnapshots"
                                :key="snapshot.publicId"
                                :snapshot="snapshot"
                                :currency="account.currency"
                                :can-write="canWrite"
                                :show-author="showAuthors"
                                :acting="store.acting"
                                :latest="index === 0"
                                @edit="openEdit"
                                @delete="deleteTarget = $event"
                            />
                            <div v-if="store.hasMoreSnapshots" class="py-3 text-center">
                                <button
                                    type="button"
                                    class="su-btn su-btn--ghost"
                                    :disabled="store.loadingMoreSnapshots"
                                    @click="onLoadMore"
                                >
                                    {{ t('comptesPage.snapshots.loadMore') }}
                                </button>
                            </div>
                        </div>
                    </PerfectScrollbar>
                </div>
            </div>
        </div>

        <AccountSnapshotAddModal
            v-model="formOpen"
            :account-public-id="account.publicId"
            :snapshot="editTarget"
            :can-restore="canRestore"
        />

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
    overflow: hidden;
    /* Marge pour le scale hover des boutons / orbs en en-tête. */
    padding: 6px;
    box-sizing: border-box;
}

.snapshots-panel__header {
    flex-shrink: 0;
}

.snapshots-panel__body {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.snapshots-summary {
    padding: 0;
    background: transparent;
    border: 0;
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

.snapshots-history {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.snapshots-history__title {
    margin-bottom: 10px;
    color: var(--ink-mute);
    font-size: 12.5px;
    font-weight: 620;
    letter-spacing: 0.01em;
}

.snapshots-history__list {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 18px), transparent);
    mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 18px), transparent);
}

.snapshots-history__scroll {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
}

.snapshots-history__scroll--native {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
}

.snapshots-history__list :deep(.ps) {
    height: 100% !important;
    max-height: 100%;
}

.snapshots-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    /* Assez de marge à gauche pour le point + halo (sinon overflow du scroll les coupe). */
    padding: 2px 4px 22px 28px;
}

.snapshots-list::before {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 28px;
    left: 13px;
    width: 2px;
    border-radius: 99px;
    background: linear-gradient(
        180deg,
        rgba(var(--v-theme-primary), 0.38) 0%,
        rgba(var(--v-theme-primary), 0.14) 55%,
        rgba(var(--v-theme-primary), 0.04) 100%
    );
}

.snapshots-empty {
    border-radius: var(--radius-leaf);
    border: 1px dashed rgba(var(--v-theme-on-surface), 0.14);
    background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
