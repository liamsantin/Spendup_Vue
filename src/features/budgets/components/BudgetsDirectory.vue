<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { budgetToFormFields } from '@/features/budgets/payload';
import { BUDGETS_PATHS, budgetDetailPath, budgetPublicIdFromPath } from '@/features/budgets/paths';
import {
    budgetAvailablePerDay,
    budgetDaysRemaining,
    budgetFilledSegments,
    endOfMonthYmd,
    formatBudgetAmount,
    formatBudgetMonth,
    formatPercentUsed,
    isBudgetPeriode,
    matchesBudgetSearch
} from '@/features/budgets/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { BUDGET_NAME_MAX, type Budget, type BudgetPeriode } from '@/features/budgets/types';
import BudgetListItem from '@/features/budgets/components/list/BudgetListItem.vue';
import BudgetFormModal from '@/features/budgets/components/modals/BudgetFormModal.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBudgetsStore();
const settings = useUserSettingsStore();

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

const GAUGE_SEGMENTS = 20;

/**
 * Bloc « Budget du mois » (maquette 06) : le budget global en cours (sans catégorie, mensuel de préférence) ;
 * à défaut, total des budgets actifs en cours dans la devise par défaut (signalé par une note).
 */
const overview = computed(() => {
    const current = store.items.filter((budget) => budget.isActive && budget.isCurrent);
    if (!current.length) return null;
    const globals = current.filter((budget) => !budget.categoryPublicId);
    const global = globals.find((budget) => budget.periode === 'mensuel') ?? globals[0] ?? null;
    if (global) {
        return {
            spent: global.spentAmount,
            limit: global.limitAmount,
            remaining: global.remainingAmount,
            percent: global.percentUsed,
            currency: global.currency,
            periodEnd: global.periodEnd,
            aggregate: false
        };
    }
    const preferred = settings.current.defaultCurrency;
    const currency = current.some((budget) => budget.currency === preferred) ? preferred : current[0].currency;
    const scoped = current.filter((budget) => budget.currency === currency);
    const spent = scoped.reduce((sum, budget) => sum + budget.spentAmount, 0);
    const limit = scoped.reduce((sum, budget) => sum + budget.limitAmount, 0);
    return {
        spent,
        limit,
        remaining: limit - spent,
        percent: limit > 0 ? (spent / limit) * 100 : 0,
        currency,
        periodEnd: endOfMonthYmd(),
        aggregate: true
    };
});

const overviewView = computed(() => {
    const data = overview.value;
    if (!data) return null;
    const daysLeft = budgetDaysRemaining(data.periodEnd);
    const over = data.remaining < 0;
    const filled = budgetFilledSegments(data.percent, GAUGE_SEGMENTS);
    const money = (amount: number) => formatBudgetAmount(amount, data.currency, locale.value);
    return {
        percentInt: new Intl.NumberFormat(locale.value || undefined, { maximumFractionDigits: 0 }).format(Math.max(0, data.percent)),
        percentText: formatPercentUsed(data.percent, locale.value),
        segments: Array.from({ length: GAUGE_SEGMENTS }, (_, index) => (over ? 'is-over' : index < filled ? 'is-used' : '')),
        spent: money(data.spent),
        limit: money(data.limit),
        remaining: money(Math.abs(data.remaining)),
        over,
        perDay: money(budgetAvailablePerDay(data.remaining, daysLeft)),
        aggregate: data.aggregate
    };
});

const monthLabel = computed(() => t('budgetsPage.hero.monthBudget', { month: formatBudgetMonth(locale.value) }));

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
        <div v-else class="budgets-directory su-g12">
            <section v-if="overviewView" class="budgets-overview" :aria-label="monthLabel">
                <p class="budgets-overview__label">{{ monthLabel }}</p>
                <p class="su-hero-num budgets-overview__num">{{ overviewView.percentInt }}<small> %</small></p>
                <div class="budgets-overview__gauge" role="img" :aria-label="overviewView.percentText">
                    <span v-for="(tone, index) in overviewView.segments" :key="index" class="budgets-overview__segment" :class="tone" />
                </div>
                <div class="su-kv">
                    <span>{{ t('budgetsPage.overview.spent') }}</span
                    ><span>{{ overviewView.spent }}</span>
                </div>
                <div class="su-kv">
                    <span>{{ t('budgetsPage.overview.budget') }}</span
                    ><span>{{ overviewView.limit }}</span>
                </div>
                <div class="su-kv su-kv--strong">
                    <span>{{ overviewView.over ? t('budgetsPage.overview.overBy') : t('budgetsPage.overview.remaining') }}</span>
                    <span :class="{ 'su-over': overviewView.over }">{{ overviewView.remaining }}</span>
                </div>
                <div class="su-kv">
                    <span>{{ t('budgetsPage.overview.perDay') }}</span
                    ><span>{{ overviewView.perDay }}</span>
                </div>
                <p v-if="overviewView.aggregate" class="budgets-overview__note">{{ t('budgetsPage.overview.aggregateNote') }}</p>
            </section>
            <section class="budgets-list" :class="{ 'budgets-list--full': !overviewView }">
                <header class="su-section__head">
                    <h2>{{ t('budgetsPage.overview.byCategory') }}</h2>
                </header>
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
/* grille 12 colonnes : bloc global (5) | par catégorie (7) ; empilée sous 960 px (kit) */
.budgets-directory {
    width: 100%;
    min-width: 0;
    padding: 8px 0 24px;
}

.budgets-overview {
    grid-column: span 5;
    min-width: 0;
    /* résumé du mois mis en avant dans une carte douce */
    align-self: start;
    padding: 24px;
    background: var(--soft);
}

.budgets-list {
    grid-column: span 7;
    min-width: 0;
}

.budgets-list--full {
    grid-column: 1 / -1;
}

.budgets-list .su-section__head {
    margin-bottom: 0;
    padding-top: 2px;
}

.budgets-overview__label {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--ink);
}

.budgets-overview__num {
    margin-bottom: 16px;
}

/* jauge segmentée : 20 carrés, bleus consommés, gris restants, violets au-delà de 100 % */
.budgets-overview__gauge {
    display: grid;
    grid-template-columns: repeat(20, minmax(0, 1fr));
    gap: 3px;
    margin-bottom: 20px;
}

.budgets-overview__segment {
    display: block;
    height: 24px;
    /* reste visible sur le fond doux de la carte */
    background: color-mix(in srgb, var(--gray) 22%, transparent);
}

.budgets-overview__segment.is-used {
    background: var(--blue);
}

.budgets-overview__segment.is-over {
    background: var(--violet);
}

.budgets-overview__note {
    margin: 12px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.budgets-directory__list {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
}

.budgets-directory__list > :deep(.budget-row:first-child) {
    border-top: 0;
}

@media (max-width: 767px) {
    .budgets-directory {
        padding: 0 0 16px;
    }

    .budgets-overview__segment {
        height: 28px;
    }
}
</style>
