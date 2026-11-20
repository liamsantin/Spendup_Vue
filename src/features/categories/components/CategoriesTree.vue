<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { budgetsApi } from '@/features/budgets/api';
import { BUDGETS_PATHS } from '@/features/budgets/paths';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import type { Category, CategoryType } from '@/features/categories/types';
import CategoryListItem from '@/features/categories/components/list/CategoryListItem.vue';
import CategoryFormModal from '@/features/categories/components/modals/CategoryFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const store = useCategoriesStore();

const createOpen = ref(false);
const createParent = ref<Category | null>(null);
const editTarget = ref<Category | null>(null);
const deleteTarget = ref<Category | null>(null);
const localError = ref<string | null>(null);
const linkedCount = ref(0);
const linkedBudgetCount = ref(0);
const expandedIds = ref<Set<string>>(new Set());

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) {
            deleteTarget.value = null;
            linkedCount.value = 0;
            linkedBudgetCount.value = 0;
        }
    }
});

const createType = computed<CategoryType | null>(() => createParent.value?.type ?? null);
const createParentId = computed(() => createParent.value?.publicId ?? null);

const deleteBlockedByChildren = computed(() => (deleteTarget.value?.children?.length ?? 0) > 0);
const deleteBlockedByTransactions = computed(() => !deleteBlockedByChildren.value && linkedCount.value > 0);
const deleteBlockedByBudgets = computed(
    () => !deleteBlockedByChildren.value && !deleteBlockedByTransactions.value && linkedBudgetCount.value > 0
);

const deleteTitle = computed(() => {
    if (deleteBlockedByChildren.value) return t('categoriesPage.deleteModal.childrenTitle');
    if (deleteBlockedByTransactions.value) return t('categoriesPage.deleteModal.linkedTitle');
    if (deleteBlockedByBudgets.value) return t('categoriesPage.deleteModal.budgetsTitle');
    return t('categoriesPage.deleteModal.title');
});

const deleteMessage = computed(() => {
    if (deleteBlockedByChildren.value) return t('categoriesPage.deleteModal.childrenBody');
    if (deleteBlockedByTransactions.value) {
        return t('categoriesPage.deleteModal.linkedBody', { count: linkedCount.value });
    }
    if (deleteBlockedByBudgets.value) {
        return t('categoriesPage.deleteModal.budgetsBody', { count: linkedBudgetCount.value });
    }
    return t('categoriesPage.deleteModal.body');
});

const deleteConfirmLabel = computed(() => {
    if (deleteBlockedByChildren.value) return t('common.close');
    if (deleteBlockedByTransactions.value) return t('categoriesPage.deleteModal.seeTransactions');
    if (deleteBlockedByBudgets.value) return t('categoriesPage.deleteModal.seeBudgets');
    return t('categoriesPage.actions.delete');
});

async function loadTree(force = false) {
    localError.value = null;
    try {
        await store.loadList({ force });
        if (!expandedIds.value.size) {
            expandedIds.value = new Set(store.items.filter((item) => item.children?.length).map((item) => item.publicId));
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('categoriesPage.errors.notFound');
            await store.loadList({ force: true }).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadTree(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadTree().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

function openCreate(parent: Category | null = null) {
    createParent.value = parent;
    createOpen.value = true;
}

function toggleExpanded(category: Category) {
    const next = new Set(expandedIds.value);
    if (next.has(category.publicId)) next.delete(category.publicId);
    else next.add(category.publicId);
    expandedIds.value = next;
}

/** Comptages de liens en cours : la confirmation attend pour choisir le bon parcours. */
const countingLinks = ref(false);
let deleteRequestSeq = 0;

async function requestDelete(category: Category) {
    const requestId = ++deleteRequestSeq;
    // une réponse tardive d'une demande précédente ne doit pas écraser les comptes de celle-ci
    const isCurrent = () => requestId === deleteRequestSeq && deleteTarget.value?.publicId === category.publicId;
    deleteTarget.value = category;
    linkedCount.value = 0;
    linkedBudgetCount.value = 0;
    if (category.children?.length) {
        countingLinks.value = false;
        return;
    }
    countingLinks.value = true;
    try {
        let transactions = 0;
        try {
            transactions = await store.countLinkedTransactions(category.publicId);
        } catch {
            transactions = 0;
        }
        if (!isCurrent()) return;
        linkedCount.value = transactions;
        if (transactions) return;
        let budgets = 0;
        try {
            const result = await budgetsApi.list({ categoryPublicId: category.publicId });
            budgets = result?.totalCount ?? result?.items?.length ?? 0;
        } catch {
            budgets = 0;
        }
        if (!isCurrent()) return;
        linkedBudgetCount.value = budgets;
    } finally {
        if (requestId === deleteRequestSeq) countingLinks.value = false;
    }
}

async function confirmDelete() {
    if (!deleteTarget.value || countingLinks.value) return;
    if (deleteBlockedByChildren.value) {
        deleteTarget.value = null;
        return;
    }
    if (deleteBlockedByTransactions.value) {
        const id = deleteTarget.value.publicId;
        deleteTarget.value = null;
        await router.push({ path: '/app/finances/transactions', query: { category: id } });
        return;
    }
    if (deleteBlockedByBudgets.value) {
        const id = deleteTarget.value.publicId;
        deleteTarget.value = null;
        await router.push({ path: BUDGETS_PATHS.list, query: { category: id } });
        return;
    }
    localError.value = null;
    try {
        await store.deleteCategory(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('categoriesPage.errors.notFound');
            deleteTarget.value = null;
            void loadTree(true).catch(() => undefined);
            return;
        }
        if (err.status === 400 && /budget/i.test(err.message)) {
            linkedBudgetCount.value = Math.max(1, linkedBudgetCount.value);
            store.clearError();
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

defineExpose({ openCreate });
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
        <div v-else-if="!store.items.length" class="su-empty">
            <p class="mb-3">{{ t('categoriesPage.empty.tree') }}</p>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="openCreate()">
                {{ t('categoriesPage.actions.create') }}
            </button>
        </div>
        <!-- arbre à plat : lignes sur filets fins, enfants repliables sous leur parent -->
        <section v-else class="categories-tree">
            <div
                v-for="root in store.items"
                :key="root.publicId"
                class="categories-tree__group"
                :class="{ 'is-expanded': expandedIds.has(root.publicId) && (root.children?.length ?? 0) > 0 }"
            >
                <CategoryListItem
                    :category="root"
                    :expanded="expandedIds.has(root.publicId)"
                    :acting="store.acting"
                    @edit="editTarget = $event"
                    @delete="requestDelete"
                    @add-child="openCreate"
                    @toggle="toggleExpanded"
                />
                <div v-if="root.children?.length" class="categories-tree__panel" :inert="!expandedIds.has(root.publicId)">
                    <div class="categories-tree__panel-inner">
                        <div class="categories-tree__children">
                            <CategoryListItem
                                v-for="child in root.children"
                                :key="child.publicId"
                                class="categories-tree__child"
                                :category="child"
                                nested
                                :acting="store.acting"
                                @edit="editTarget = $event"
                                @delete="requestDelete"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <CategoryFormModal v-model="createOpen" :default-parent-public-id="createParentId" :default-type="createType" />
        <CategoryFormModal v-model="editOpen" :category="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteTitle"
            :message="deleteMessage"
            :confirm-label="deleteConfirmLabel"
            :confirm-color="deleteBlockedByChildren || deleteBlockedByTransactions || deleteBlockedByBudgets ? 'primary' : 'error'"
            :loading="store.acting || countingLinks"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.categories-tree {
    overflow-x: hidden;
    min-width: 0;
    border-bottom: 1px solid var(--line);
}

.categories-tree__group {
    min-width: 0;
}

/* dépliage : hauteur animée, sans fond ni flou */
.categories-tree__panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.32s var(--ease);
}

.categories-tree__group.is-expanded .categories-tree__panel {
    grid-template-rows: 1fr;
}

.categories-tree__panel-inner {
    min-height: 0;
    overflow: hidden;
}

.categories-tree__children {
    min-width: 0;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transition: opacity 0.2s var(--ease);
}

.categories-tree__group.is-expanded .categories-tree__children {
    opacity: 1;
    transition: opacity 0.25s var(--ease) 0.08s;
}

@media (prefers-reduced-motion: reduce) {
    .categories-tree__panel,
    .categories-tree__children {
        transition: none !important;
    }
}
</style>
