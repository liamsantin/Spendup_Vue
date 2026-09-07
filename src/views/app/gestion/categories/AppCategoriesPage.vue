<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, TemplateIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CategoriesTree, CategoryPlanModal, useCategoriesStore } from '@/features/categories';

const { t } = useI18n();
const store = useCategoriesStore();
const treeRef = ref<{ openCreate: (parent?: null) => void } | null>(null);
const planOpen = ref(false);

function onCreate() {
    if (store.acting) return;
    treeRef.value?.openCreate();
}

function onOpenPlan() {
    if (store.acting) return;
    planOpen.value = true;
}
</script>

<template>
    <AppPageShell :title="t('categoriesPage.title')" :subtitle="t('categoriesPage.subtitle')">
        <template #actions>
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
    </AppPageShell>
</template>
