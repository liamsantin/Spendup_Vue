<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
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
        }
    }
});

const createType = computed<CategoryType | null>(() => createParent.value?.type ?? null);
const createParentId = computed(() => createParent.value?.publicId ?? null);

const deleteBlockedByChildren = computed(() => (deleteTarget.value?.children?.length ?? 0) > 0);
const deleteBlockedByTransactions = computed(() => !deleteBlockedByChildren.value && linkedCount.value > 0);

const deleteTitle = computed(() => {
    if (deleteBlockedByChildren.value) return t('categoriesPage.deleteModal.childrenTitle');
    if (deleteBlockedByTransactions.value) return t('categoriesPage.deleteModal.linkedTitle');
    return t('categoriesPage.deleteModal.title');
});

const deleteMessage = computed(() => {
    if (deleteBlockedByChildren.value) return t('categoriesPage.deleteModal.childrenBody');
    if (deleteBlockedByTransactions.value) {
        return t('categoriesPage.deleteModal.linkedBody', { count: linkedCount.value });
    }
    return t('categoriesPage.deleteModal.body');
});

const deleteConfirmLabel = computed(() => {
    if (deleteBlockedByChildren.value) return t('common.close');
    if (deleteBlockedByTransactions.value) return t('categoriesPage.deleteModal.seeTransactions');
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

async function requestDelete(category: Category) {
    deleteTarget.value = category;
    linkedCount.value = 0;
    if (category.children?.length) return;
    try {
        linkedCount.value = await store.countLinkedTransactions(category.publicId);
    } catch {
        linkedCount.value = 0;
    }
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
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
    localError.value = null;
    try {
        await store.deleteCategory(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('categoriesPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            deleteTarget.value = null;
            void loadTree(true).catch(() => undefined);
        }
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
        <div v-else class="su-stack">
            <section class="su-surface categories-tree">
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
                                    v-for="(child, index) in root.children"
                                    :key="child.publicId"
                                    class="categories-tree__child"
                                    :style="{ '--i': index }"
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
        </div>

        <CategoryFormModal v-model="createOpen" :default-parent-public-id="createParentId" :default-type="createType" />
        <CategoryFormModal v-model="editOpen" :category="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteTitle"
            :message="deleteMessage"
            :confirm-label="deleteConfirmLabel"
            :confirm-color="deleteBlockedByChildren || deleteBlockedByTransactions ? 'primary' : 'error'"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.categories-tree {
    overflow-x: hidden;
    min-width: 0;
}

.categories-tree__group {
    min-width: 0;
    border-radius: 14px;
    transition:
        background 0.35s var(--ease, ease),
        padding-bottom 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.categories-tree__group + .categories-tree__group {
    margin-top: 2px;
}

.categories-tree__group.is-expanded {
    background: rgba(var(--v-theme-on-surface), 0.025);
    padding-bottom: 4px;
}

.categories-tree__panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.48s cubic-bezier(0.22, 1, 0.36, 1);
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
    margin: 0 8px 0 38px;
    padding: 0 0 2px 12px;
    border-left: 1px solid transparent;
    display: flex;
    flex-direction: column;
    gap: 1px;
    opacity: 0;
    transform: translateY(-8px);
    filter: blur(1.5px);
    transition:
        opacity 0.22s ease,
        transform 0.28s cubic-bezier(0.4, 0, 1, 1),
        filter 0.22s ease,
        border-color 0.3s ease,
        margin 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        padding 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.categories-tree__group.is-expanded .categories-tree__children {
    border-left-color: var(--stroke);
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
    transition:
        opacity 0.38s ease 0.06s,
        transform 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.04s,
        filter 0.35s ease 0.05s,
        border-color 0.35s ease 0.05s,
        margin 0.48s cubic-bezier(0.22, 1, 0.36, 1),
        padding 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.categories-tree__child {
    opacity: 0;
    transform: translateY(-6px);
    transition:
        opacity 0.28s ease,
        transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.categories-tree__group.is-expanded .categories-tree__child {
    opacity: 1;
    transform: translateY(0);
    transition-delay: calc(0.06s + var(--i, 0) * 45ms);
}

@media (max-width: 600px) {
    .categories-tree__children {
        margin-left: 24px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .categories-tree__group,
    .categories-tree__panel,
    .categories-tree__children,
    .categories-tree__child {
        transition: none !important;
        filter: none !important;
        transform: none !important;
    }

    .categories-tree__children,
    .categories-tree__child {
        opacity: 1;
    }
}
</style>
