<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { CategoriesTree, useCategoriesStore } from '@/features/categories';

const { t } = useI18n();
const store = useCategoriesStore();
const treeRef = ref<{ openCreate: (parent?: null) => void } | null>(null);

function onCreate() {
    if (store.acting) return;
    treeRef.value?.openCreate();
}
</script>

<template>
    <AppPageShell :title="t('categoriesPage.title')" :subtitle="t('categoriesPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('categoriesPage.actions.create') }}
            </button>
        </template>

        <CategoriesTree ref="treeRef" />
    </AppPageShell>
</template>
