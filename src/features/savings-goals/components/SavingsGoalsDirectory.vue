<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { SAVINGS_GOALS_PATHS, savingsGoalDetailPath, savingsGoalPublicIdFromPath } from '@/features/savings-goals/paths';
import { isSavingsGoalStatus, matchesSavingsGoalSearch } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import { SAVINGS_GOAL_NAME_MAX, type SavingsGoal, type SavingsGoalStatus } from '@/features/savings-goals/types';
import SavingsGoalListItem from '@/features/savings-goals/components/list/SavingsGoalListItem.vue';
import SavingsGoalFormModal from '@/features/savings-goals/components/modals/SavingsGoalFormModal.vue';
import SavingsGoalDepositModal from '@/features/savings-goals/components/modals/SavingsGoalDepositModal.vue';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSavingsGoalsStore();
const accountsStore = useAccountsStore();

const createOpen = ref(false);
const editTarget = ref<SavingsGoal | null>(null);
const deleteTarget = ref<SavingsGoal | null>(null);
const depositTarget = ref<SavingsGoal | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) {
            editTarget.value = null;
            clearDetailPath();
        }
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

const depositOpen = computed({
    get: () => !!depositTarget.value,
    set: (value: boolean) => {
        if (!value) depositTarget.value = null;
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, SAVINGS_GOAL_NAME_MAX) ?? null);
const filterStatus = computed<SavingsGoalStatus | null>(() => {
    const raw = queryString('status');
    return isSavingsGoalStatus(raw) ? raw : null;
});
const filterAccount = computed(() => queryString('account'));

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    if (!needle) return store.items;
    return store.items.filter((goal) => matchesSavingsGoalSearch(goal, needle));
});

const hasExtraFilters = computed(() => !!(filterSearch.value || filterAccount.value));
const emptyCopy = computed(() => {
    if (hasExtraFilters.value) return t('savingsGoalsPage.empty.filtered');
    if (filterStatus.value === 'active') return t('savingsGoalsPage.empty.active');
    if (filterStatus.value === 'atteint') return t('savingsGoalsPage.empty.atteint');
    if (filterStatus.value === 'abandonne') return t('savingsGoalsPage.empty.abandonne');
    return t('savingsGoalsPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            status: filterStatus.value ?? undefined,
            accountPublicId: filterAccount.value ?? undefined,
            force
        });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory(true).catch(() => undefined);
}

function clearDetailPath() {
    const currentId = savingsGoalPublicIdFromPath(route.path);
    if (!currentId) return;
    void router.replace({ path: SAVINGS_GOALS_PATHS.list, query: route.query });
}

async function openDetail(goal: SavingsGoal, pushPath = true) {
    editTarget.value = goal;
    if (!pushPath) return;
    if (savingsGoalPublicIdFromPath(route.path) === goal.publicId) return;
    await router.replace({ path: savingsGoalDetailPath(goal.publicId), query: route.query });
}

async function syncDetailFromRoute() {
    const id = savingsGoalPublicIdFromPath(route.path);
    if (!id) return;
    if (editTarget.value?.publicId === id) return;
    try {
        const goal = store.findByPublicId(id) ?? (await store.fetchSavingsGoal(id));
        if (goal) editTarget.value = goal;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('savingsGoalsPage.errors.notFound') : getErrorMessage(e);
        clearDetailPath();
    }
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!accountsStore.initialized) {
        void accountsStore.loadAccounts().catch(() => undefined);
    }
    void loadDirectory()
        .then(() => syncDetailFromRoute())
        .catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [filterStatus.value, filterAccount.value] as const,
    () => {
        void loadDirectory().catch(() => undefined);
    }
);

watch(filterSearch, (search, previousSearch) => {
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) {
        searchRevealKey.value += 1;
    }
});

watch(
    () => route.path,
    () => {
        void syncDetailFromRoute();
    }
);

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

function requestDelete(goal: SavingsGoal) {
    deleteTarget.value = goal;
}

function requestDeposit(goal: SavingsGoal) {
    depositTarget.value = goal;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteSavingsGoal(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('savingsGoalsPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div>
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
        <div v-else class="savings-goals-directory">
            <div :key="searchRevealKey" class="savings-goals-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                <SavingsGoalListItem
                    v-for="(goal, index) in visibleItems"
                    :key="goal.publicId"
                    :savings-goal="goal"
                    :acting="store.acting"
                    :style="{ '--i': index }"
                    @edit="openDetail"
                    @delete="requestDelete"
                    @deposit="requestDeposit"
                />
            </div>
        </div>

        <SavingsGoalFormModal v-model="createOpen" />
        <SavingsGoalFormModal v-model="editOpen" :savings-goal="editTarget" />
        <SavingsGoalDepositModal v-model="depositOpen" :savings-goal="depositTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('savingsGoalsPage.deleteModal.title')"
            :message="t('savingsGoalsPage.deleteModal.body')"
            :confirm-label="t('savingsGoalsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.savings-goals-directory {
    width: 100%;
    min-width: 0;
}

.savings-goals-directory__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    overflow: visible;
    padding: 0;
}

@media (max-width: 767px) {
    .savings-goals-directory {
        margin-inline: -8px;
        width: calc(100% + 16px);
    }

    .savings-goals-directory__list {
        gap: 8px;
    }
}
</style>
