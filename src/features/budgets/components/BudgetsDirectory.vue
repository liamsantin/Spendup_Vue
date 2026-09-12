<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { budgetToFormFields } from '@/features/budgets/payload';
import { BUDGETS_PATHS, budgetDetailPath, budgetPublicIdFromPath } from '@/features/budgets/paths';
import { isBudgetPeriode, matchesBudgetSearch } from '@/features/budgets/format';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { BUDGET_NAME_MAX, type Budget, type BudgetPeriode } from '@/features/budgets/types';
import BudgetListItem from '@/features/budgets/components/list/BudgetListItem.vue';
import BudgetFormModal from '@/features/budgets/components/modals/BudgetFormModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBudgetsStore();

const createOpen = ref(false);
const editTarget = ref<Budget | null>(null);
const deleteTarget = ref<Budget | null>(null);
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

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, BUDGET_NAME_MAX) ?? null);
const filterActive = computed<boolean | null>(() => {
    const raw = queryString('status');
    if (raw === 'active') return true;
    if (raw === 'paused') return false;
    return null;
});
const filterPeriode = computed<BudgetPeriode | null>(() => {
    const raw = queryString('periode');
    return isBudgetPeriode(raw) ? raw : null;
});
const filterCategory = computed(() => queryString('category'));

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    if (!needle) return store.items;
    return store.items.filter((budget) => matchesBudgetSearch(budget, needle));
});

const hasExtraFilters = computed(() => !!(filterSearch.value || filterPeriode.value || filterCategory.value));
const emptyCopy = computed(() => {
    if (hasExtraFilters.value) return t('budgetsPage.empty.filtered');
    if (filterActive.value === true) return t('budgetsPage.empty.active');
    if (filterActive.value === false) return t('budgetsPage.empty.paused');
    return t('budgetsPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            isActive: filterActive.value ?? undefined,
            periode: filterPeriode.value ?? undefined,
            categoryPublicId: filterCategory.value ?? undefined,
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
    const currentId = budgetPublicIdFromPath(route.path);
    if (!currentId) return;
    void router.replace({ path: BUDGETS_PATHS.list, query: route.query });
}

async function openDetail(budget: Budget, pushPath = true) {
    editTarget.value = budget;
    if (!pushPath) return;
    if (budgetPublicIdFromPath(route.path) === budget.publicId) return;
    await router.replace({ path: budgetDetailPath(budget.publicId), query: route.query });
}

async function syncDetailFromRoute() {
    const id = budgetPublicIdFromPath(route.path);
    if (!id) return;
    if (editTarget.value?.publicId === id) return;
    try {
        const budget = store.findByPublicId(id) ?? (await store.fetchBudget(id));
        if (budget) editTarget.value = budget;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('budgetsPage.errors.notFound') : getErrorMessage(e);
        clearDetailPath();
    }
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory()
        .then(() => syncDetailFromRoute())
        .catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [filterActive.value, filterPeriode.value, filterCategory.value] as const,
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

function requestDelete(budget: Budget) {
    deleteTarget.value = budget;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteBudget(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('budgetsPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function toggleActive(budget: Budget) {
    localError.value = null;
    const fields = budgetToFormFields(budget);
    fields.isActive = !budget.isActive;
    try {
        await store.updateBudget(budget.publicId, fields, { lockedCurrency: budget.currency });
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('budgetsPage.errors.notFound') : getErrorMessage(e);
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
        <div v-else class="su-stack">
            <section class="su-surface budgets-directory__group">
                <div :key="searchRevealKey" class="budgets-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                    <BudgetListItem
                        v-for="(budget, index) in visibleItems"
                        :key="budget.publicId"
                        :budget="budget"
                        :acting="store.acting"
                        :style="{ '--i': index }"
                        @edit="openDetail"
                        @delete="requestDelete"
                        @toggle-active="toggleActive"
                    />
                </div>
            </section>
        </div>

        <BudgetFormModal v-model="createOpen" />
        <BudgetFormModal v-model="editOpen" :budget="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('budgetsPage.deleteModal.title')"
            :message="t('budgetsPage.deleteModal.body')"
            :confirm-label="t('budgetsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.budgets-directory__group {
    overflow: visible;
}

.budgets-directory__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
    padding: 8px;
}
</style>
