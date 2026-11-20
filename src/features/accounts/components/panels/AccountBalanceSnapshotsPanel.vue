<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, Receipt2Icon } from 'vue-tabler-icons';
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

/** Ton de l'écart : concordance en bleu (donnée clé), écart en violet (alerte), inconnu en gris. */
const diffTone = computed(() => {
    if (balanceDiff.value === null) return 'is-unknown';
    if (isMatched.value) return 'is-matched';
    return 'is-mismatch';
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
        <header class="snapshots-panel__header su-section__head">
            <div class="min-width-0">
                <h2>{{ t('comptesPage.snapshots.title') }}</h2>
                <p>{{ t('comptesPage.snapshots.subtitle') }}</p>
            </div>
            <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="openAdd">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('comptesPage.snapshots.add') }}
            </button>
        </header>

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
                    <span class="su-chip" :style="{ '--chip-color': isMatched ? 'var(--blue)' : 'var(--violet)' }">
                        {{ isMatched ? t('comptesPage.snapshots.matched') : t('comptesPage.snapshots.mismatch') }}
                    </span>
                </template>

                <!-- Synthèse en chiffres clés : dernier relevé déclaré, écart avec le solde courant -->
                <div class="su-figs snapshots-summary">
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('comptesPage.snapshots.latestDeclared') }}</p>
                        <p class="su-fig__num snapshots-summary__num">
                            {{ formatAccountBalance(latestSnapshot.balance, account.currency, locale) }}
                        </p>
                        <p class="su-fig__note">
                            {{ formatDate(latestSnapshot.snapshotAt) }}
                            <template v-if="showAuthors"> · {{ authorLabel(latestSnapshot) }}</template>
                        </p>
                    </div>

                    <div v-if="balanceDiff !== null" class="su-fig">
                        <p class="su-fig__label">{{ t('comptesPage.snapshots.diffShort') }}</p>
                        <p class="su-fig__num snapshots-summary__num" :class="diffTone">
                            <template v-if="isMatched">
                                {{ formatAccountBalance(0, account.currency, locale) }}
                            </template>
                            <template v-else>
                                {{ balanceDiff >= 0 ? '+' : '' }}{{ formatAccountBalance(balanceDiff, account.currency, locale) }}
                            </template>
                        </p>
                        <p class="su-fig__note">{{ t('comptesPage.snapshots.diff') }}</p>
                    </div>
                </div>
            </AppAccordion>

            <div v-if="store.loadingSnapshots && !store.balanceSnapshots.length" class="su-loading flex-shrink-0">
                <span class="su-spin" />
            </div>

            <div v-else-if="!store.balanceSnapshots.length" class="su-empty flex-shrink-0">
                <span class="su-empty__mark"><Receipt2Icon :size="22" stroke-width="1.5" /></span>
                <p class="snapshots-empty__title">{{ t('comptesPage.snapshots.empty') }}</p>
                <p class="snapshots-empty__hint">{{ t('comptesPage.snapshots.emptyHint') }}</p>
                <button v-if="canWrite" type="button" class="su-btn su-btn--ink" @click="openAdd">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('comptesPage.snapshots.add') }}
                </button>
            </div>

            <div v-else class="snapshots-history">
                <p class="su-section-label snapshots-history__title flex-shrink-0">{{ t('comptesPage.snapshots.history') }}</p>
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
                            <div v-if="store.hasMoreSnapshots" class="su-more">
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
                            <div v-if="store.hasMoreSnapshots" class="su-more">
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
/* Relevés : en-tête de section, synthèse en chiffres clés, historique en lignes à filet fin. */
.snapshots-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
}

.snapshots-panel__header {
    flex-shrink: 0;
    align-items: center;
}

.snapshots-panel__body {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.snapshots-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-bottom: 8px;
}

.snapshots-summary__num {
    font-size: 22px;
}

.snapshots-summary__num.is-matched {
    color: var(--blue-ink);
}

.snapshots-summary__num.is-mismatch {
    color: var(--violet-ink);
}

.snapshots-summary__num.is-unknown {
    color: var(--gray);
}

@media (max-width: 479.98px) {
    .snapshots-summary {
        grid-template-columns: minmax(0, 1fr);
    }
}

.snapshots-empty__title {
    margin: 0;
    color: var(--ink);
    font-weight: 700;
}

.snapshots-empty__hint {
    margin: 0 0 8px;
}

.snapshots-history {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.snapshots-history__title {
    margin-bottom: 4px;
}

.snapshots-history__list {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
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
    display: flex;
    flex-direction: column;
    padding: 0 4px 16px 0;
}
</style>
