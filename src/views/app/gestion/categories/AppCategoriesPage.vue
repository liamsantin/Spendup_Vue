<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, TemplateIcon, TrashIcon } from 'vue-tabler-icons';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CategoriesTree, CategoryPlanModal, useCategoriesStore } from '@/features/categories';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t } = useI18n();
const store = useCategoriesStore();
const treeRef = ref<{ openCreate: (parent?: null) => void } | null>(null);
const planOpen = ref(false);
const deleteAllOpen = ref(false);
const deleteAllError = ref<string | null>(null);

const canDeleteAll = computed(() => store.hasItems && !store.acting);

function onCreate() {
    if (store.acting) return;
    treeRef.value?.openCreate();
}

function onOpenPlan() {
    if (store.acting) return;
    planOpen.value = true;
}

function onOpenDeleteAll() {
    if (!canDeleteAll.value) return;
    deleteAllError.value = null;
    deleteAllOpen.value = true;
}

async function confirmDeleteAll() {
    if (!canDeleteAll.value) return;
    deleteAllError.value = null;
    store.clearError();
    try {
        const result = await store.deleteAllCategories();
        if (result.failed > 0) {
            deleteAllError.value = t('categoriesPage.deleteAllModal.partialError', { count: result.failed });
            return;
        }
        deleteAllOpen.value = false;
    } catch (e: unknown) {
        deleteAllError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppPageShell :title="t('categoriesPage.title')" :subtitle="t('categoriesPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn su-btn--danger" :disabled="!canDeleteAll" @click="onOpenDeleteAll">
                <TrashIcon :size="16" stroke-width="1.6" />
                {{ t('categoriesPage.actions.deleteAll') }}
            </button>
            <button type="button" class="su-btn" :disabled="store.acting" @click="onOpenPlan">
                <TemplateIcon :size="16" stroke-width="1.6" />
                {{ t('categoriesPage.actions.applyPlan') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('categoriesPage.actions.create') }}
            </button>
        </template>

        <CategoriesTree ref="treeRef" />
        <CategoryPlanModal v-model="planOpen" />

        <AppConfirmationModal
            v-model="deleteAllOpen"
            :title="t('categoriesPage.deleteAllModal.title')"
            :message="deleteAllError || t('categoriesPage.deleteAllModal.body')"
            :confirm-label="t('categoriesPage.deleteAllModal.confirm')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDeleteAll"
        />
    </AppPageShell>
</template>
