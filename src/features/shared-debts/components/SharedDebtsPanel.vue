<script setup lang="ts">
/**
 * Panneau « Dettes entre amis » de la page Dettes (`/app/patrimoine/dettes/amis`).
 * Chiffres clés (on me doit / je dois), sous-onglets créancier · débiteur (query `role`),
 * liste `su-person`, modales de création, d’édition, de remboursement et de détail.
 * Route lue : `:publicId` (détail ouvert), query `role`, `status`, `q`.
 * Le parent appelle `openCreate()` via `defineExpose`.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useFriendNicknameLabels } from '@/features/friends';
import { DEBTS_PATHS, sharedDebtDetailPath, sharedDebtPublicIdFromPath } from '@/features/liabilities/paths';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatSharedDebtAmount, isSharedDebtRole, isSharedDebtStatus, matchesSharedDebtSearch } from '@/features/shared-debts/format';
import { useSharedDebtsStore } from '@/features/shared-debts/stores/shared-debts-store';
import {
    SHARED_DEBT_DEFAULT_ROLE,
    SHARED_DEBT_LABEL_MAX,
    type SharedDebt,
    type SharedDebtRole,
    type SharedDebtStatus
} from '@/features/shared-debts/types';
import SharedDebtListItem from '@/features/shared-debts/components/list/SharedDebtListItem.vue';
import SharedDebtDetailModal from '@/features/shared-debts/components/modals/SharedDebtDetailModal.vue';
import SharedDebtFormModal from '@/features/shared-debts/components/modals/SharedDebtFormModal.vue';
import SharedDebtSettleModal from '@/features/shared-debts/components/modals/SharedDebtSettleModal.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSharedDebtsStore();
const settings = useUserSettingsStore();
const { ensureLoaded: ensureNicknames, nicknameByUserId } = useFriendNicknameLabels();

const createOpen = ref(false);
const editTarget = ref<SharedDebt | null>(null);
const settleTarget = ref<SharedDebt | null>(null);
const detailTarget = ref<SharedDebt | null>(null);
const cancelTarget = ref<SharedDebt | null>(null);
const deleteTarget = ref<SharedDebt | null>(null);
const localError = ref<string | null>(null);

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));

/** v-model booléen dérivé d’une cible : fermer = vider la cible. */
function targetModel(target: typeof editTarget, onClose?: () => void) {
    return computed({
        get: () => !!target.value,
        set: (value: boolean) => {
            if (value) return;
            target.value = null;
            onClose?.();
        }
    });
}

const editOpen = targetModel(editTarget);
const settleOpen = targetModel(settleTarget);
const detailOpen = targetModel(detailTarget, clearDetailPath);
const cancelOpen = targetModel(cancelTarget);
const deleteOpen = targetModel(deleteTarget);

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const activeRole = computed<SharedDebtRole>(() => {
    const raw = queryString('role');
    return isSharedDebtRole(raw) ? raw : SHARED_DEBT_DEFAULT_ROLE;
});

const filterStatus = computed<SharedDebtStatus | null>(() => {
    const raw = queryString('status');
    return isSharedDebtStatus(raw) ? raw : null;
});

const filterSearch = computed(() => queryString('q')?.slice(0, SHARED_DEBT_LABEL_MAX) ?? null);

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    if (!needle) return store.items;
    return store.items.filter((debt) => matchesSharedDebtSearch(debt, needle, nicknameByUserId.value));
});

const totalsCurrency = computed(() => store.totalsCurrency ?? settings.current.defaultCurrency);

const owedToMeText = computed(() => {
    const value = formatSharedDebtAmount(store.totalOwedToMe, totalsCurrency.value, locale.value);
    return store.totalOwedToMe > 0 ? `+${value}` : value;
});

const iOweText = computed(() => {
    const value = formatSharedDebtAmount(store.totalIOwe, totalsCurrency.value, locale.value);
    return store.totalIOwe > 0 ? `−${value}` : value;
});

const roleTabs = computed(() =>
    (['creditor', 'debtor'] as const).map((role) => ({
        role,
        label: t(`sharedDebtsPage.tabs.${role}`),
        to: { path: DEBTS_PATHS.shared, query: roleQuery(role) }
    }))
);

/** Query d’un sous-onglet : conserve `q`, retire `status` (propre à chaque point de vue) et le rôle par défaut. */
function roleQuery(role: SharedDebtRole): LocationQueryRaw {
    const query: LocationQueryRaw = { ...route.query };
    delete query.status;
    if (role === SHARED_DEBT_DEFAULT_ROLE) delete query.role;
    else query.role = role;
    return query;
}

const emptyCopy = computed(() => {
    if (filterSearch.value) return t('sharedDebtsPage.empty.filtered');
    if (filterStatus.value) return t('sharedDebtsPage.empty.status');
    return t(`sharedDebtsPage.empty.${activeRole.value}`);
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadPanel(force = false) {
    localError.value = null;
    try {
        await store.loadList({ role: activeRole.value, status: filterStatus.value ?? undefined, force });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadPanel(true);
}

function clearDetailPath() {
    if (!sharedDebtPublicIdFromPath(route.path)) return;
    void router.replace({ path: DEBTS_PATHS.shared, query: route.query });
}

async function openDetail(debt: SharedDebt) {
    detailTarget.value = debt;
    if (sharedDebtPublicIdFromPath(route.path) !== debt.publicId) {
        await router.replace({ path: sharedDebtDetailPath(debt.publicId), query: route.query });
    }
    try {
        const fresh = await store.fetchSharedDebt(debt.publicId, true);
        if (fresh && detailTarget.value?.publicId === fresh.publicId) detailTarget.value = fresh;
    } catch {
        // la fiche garde la version de la liste ; un 404 est géré par la synchro de route
    }
}

async function syncDetailFromRoute() {
    const id = sharedDebtPublicIdFromPath(route.path);
    if (!id) {
        detailTarget.value = null;
        return;
    }
    if (detailTarget.value?.publicId === id) return;
    try {
        const debt = await store.fetchSharedDebt(id, true);
        if (debt) detailTarget.value = debt;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('sharedDebtsPage.errors.notFound') : getErrorMessage(e);
        clearDetailPath();
    }
}

/** Ferme la fiche (et son chemin) avant d’ouvrir une modale d’action. */
function fromDetail(action: (debt: SharedDebt) => void) {
    return (debt: SharedDebt) => {
        detailOpen.value = false;
        action(debt);
    };
}

function requestSettle(debt: SharedDebt) {
    settleTarget.value = debt;
}

function requestEdit(debt: SharedDebt) {
    editTarget.value = debt;
}

function requestCancel(debt: SharedDebt) {
    cancelTarget.value = debt;
}

function requestDelete(debt: SharedDebt) {
    deleteTarget.value = debt;
}

const onDetailSettle = fromDetail(requestSettle);
const onDetailEdit = fromDetail(requestEdit);
const onDetailCancel = fromDetail(requestCancel);
const onDetailDelete = fromDetail(requestDelete);

function handleActionError(e: unknown) {
    const err = AppError.fromUnknown(e);
    if (err.status === 404) {
        localError.value = t('sharedDebtsPage.errors.notFound');
        void loadPanel(true);
        return;
    }
    localError.value = getErrorMessage(e);
}

async function confirmCancel() {
    const target = cancelTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.cancelSharedDebt(target.publicId);
        cancelTarget.value = null;
    } catch (e: unknown) {
        cancelTarget.value = null;
        handleActionError(e);
    }
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteSharedDebt(target.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        deleteTarget.value = null;
        handleActionError(e);
    }
}

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void ensureNicknames().catch(() => undefined);
    // dette supprimée ailleurs (realtime, autre onglet) : on referme ce qui la visait
    unsubscribeDeleted = store.subscribeToDeleted((publicId) => {
        if (detailTarget.value?.publicId === publicId) detailOpen.value = false;
        if (editTarget.value?.publicId === publicId) editTarget.value = null;
        if (settleTarget.value?.publicId === publicId) settleTarget.value = null;
        if (cancelTarget.value?.publicId === publicId) cancelTarget.value = null;
    });
    void loadPanel().then(() => syncDetailFromRoute());
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted?.();
    unsubscribeDeleted = null;
});

watch(
    () => [activeRole.value, filterStatus.value] as const,
    () => {
        void loadPanel();
    }
);

watch(filterSearch, (search, previousSearch) => {
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) searchRevealKey.value += 1;
});

watch(
    () => route.path,
    () => {
        void syncDetailFromRoute();
    }
);
</script>

<template>
    <div class="shared-debts-panel">
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div class="su-figs shared-debts-panel__figs">
            <div class="su-fig">
                <p class="su-fig__label">{{ t('sharedDebtsPage.figures.owedToMe') }}</p>
                <p class="su-fig__num" :class="{ 'su-pos': store.totalOwedToMe > 0 }">{{ owedToMeText }}</p>
                <p class="su-fig__note">{{ t('sharedDebtsPage.figures.owedToMeNote') }}</p>
            </div>
            <div class="su-fig">
                <p class="su-fig__label">{{ t('sharedDebtsPage.figures.iOwe') }}</p>
                <p class="su-fig__num" :class="{ 'su-neg': store.totalIOwe > 0 }">{{ iOweText }}</p>
                <p class="su-fig__note">{{ t('sharedDebtsPage.figures.iOweNote') }}</p>
            </div>
        </div>

        <nav class="su-tabs shared-debts-panel__tabs" :aria-label="t('sharedDebtsPage.tabs.label')">
            <RouterLink
                v-for="tab in roleTabs"
                :key="tab.role"
                :to="tab.to"
                replace
                class="su-tab"
                :class="{ 'is-active': activeRole === tab.role }"
                :aria-current="activeRole === tab.role ? 'page' : undefined"
            >
                <span class="su-tab__label" :data-label="tab.label">{{ tab.label }}</span>
            </RouterLink>
        </nav>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div
            v-else-if="!visibleItems.length"
            :key="`empty-${searchRevealKey}`"
            class="su-empty"
            :class="{ 'is-search-reveal': searchReveals }"
        >
            <p>{{ emptyCopy }}</p>
        </div>
        <div v-else :key="searchRevealKey" class="shared-debts-panel__list" :class="{ 'is-search-reveal': searchReveals }">
            <SharedDebtListItem
                v-for="(debt, index) in visibleItems"
                :key="debt.publicId"
                :shared-debt="debt"
                :today="today"
                :nickname-map="nicknameByUserId"
                :acting="store.acting"
                :style="{ '--i': index }"
                @open="openDetail"
                @settle="requestSettle"
                @edit="requestEdit"
                @cancel="requestCancel"
                @delete="requestDelete"
            />
        </div>

        <SharedDebtFormModal v-model="createOpen" />
        <SharedDebtFormModal v-model="editOpen" :shared-debt="editTarget" />
        <SharedDebtSettleModal v-model="settleOpen" :shared-debt="settleTarget" />
        <SharedDebtDetailModal
            v-model="detailOpen"
            :shared-debt="detailTarget"
            :nickname-map="nicknameByUserId"
            @settle="onDetailSettle"
            @edit="onDetailEdit"
            @cancel="onDetailCancel"
            @delete="onDetailDelete"
        />

        <AppConfirmationModal
            v-model="cancelOpen"
            :title="t('sharedDebtsPage.cancelModal.title')"
            :message="t('sharedDebtsPage.cancelModal.body')"
            :confirm-label="t('sharedDebtsPage.actions.cancel')"
            confirm-color="warning"
            :loading="store.acting"
            @confirm="confirmCancel"
        />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('sharedDebtsPage.deleteModal.title')"
            :message="t('sharedDebtsPage.deleteModal.body')"
            :confirm-label="t('sharedDebtsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.shared-debts-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    min-width: 0;
    padding-bottom: 24px;
}

.shared-debts-panel__figs .su-pos {
    color: var(--blue-ink);
}

.shared-debts-panel__figs .su-neg {
    color: var(--ink);
}

.shared-debts-panel__tabs .su-tab {
    text-decoration: none;
}

.shared-debts-panel__list {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

@media (max-width: 767px) {
    .shared-debts-panel {
        gap: 16px;
        padding-bottom: 16px;
    }
}
</style>
