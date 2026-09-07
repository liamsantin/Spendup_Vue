<script setup lang="ts">
/**
 * Modale d’aperçu / application du plan de catégories prédéfini.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { resolveCategoryIcon } from '@/features/categories/icons';
import { DEFAULT_CATEGORY_PLAN, type CategoryPlanNodeDef } from '@/features/categories/plans';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    applied: [];
}>();

const { t } = useI18n();
const store = useCategoriesStore();
const localError = ref<string | null>(null);
const applying = ref(false);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

type PreviewNode = {
    name: string;
    type: CategoryPlanNodeDef['type'];
    color?: string;
    icone?: string;
    children: Array<{ name: string; type: CategoryPlanNodeDef['type']; color?: string; icone?: string }>;
};

const previewNodes = computed<PreviewNode[]>(() =>
    DEFAULT_CATEGORY_PLAN.map((root) => ({
        name: t(`categoriesPage.plan.nodes.${root.nameKey}`),
        type: root.type,
        color: root.color,
        icone: root.icone,
        children: (root.children ?? []).map((child) => ({
            name: t(`categoriesPage.plan.nodes.${child.nameKey}`),
            type: child.type ?? root.type,
            color: child.color,
            icone: child.icone
        }))
    }))
);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) localError.value = null;
    }
);

async function onApply() {
    if (applying.value || store.acting) return;
    applying.value = true;
    localError.value = null;
    store.clearError();
    try {
        await store.applyCategoryPlan(previewNodes.value);
        open.value = false;
        emit('applied');
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        applying.value = false;
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('categoriesPage.plan.modal.title')"
        :subtitle="t('categoriesPage.plan.modal.subtitle')"
        :max-width="560"
        :height="640"
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError || store.error" type="error" class="mb-4" closable @dismiss="localError = null; store.clearError()">
            {{ localError || store.error }}
        </AppAlert>

        <p class="text-body-2 text-medium-emphasis mb-4">
            {{ t('categoriesPage.plan.modal.intro') }}
        </p>

        <div class="category-plan-preview">
            <div v-for="root in previewNodes" :key="`${root.type}-${root.name}`" class="category-plan-preview__group">
                <div class="category-plan-preview__root">
                    <span
                        class="category-plan-preview__icon"
                        :class="{ 'category-plan-preview__icon--empty': !root.color }"
                        :style="root.color ? { backgroundColor: root.color } : undefined"
                    >
                        <component :is="resolveCategoryIcon(root.icone)" size="16" stroke-width="1.8" />
                    </span>
                    <span class="category-plan-preview__name">{{ root.name }}</span>
                    <span class="category-plan-preview__badge" :class="`is-${root.type}`">
                        {{ t(`categoriesPage.types.${root.type}`) }}
                    </span>
                </div>
                <ul v-if="root.children.length" class="category-plan-preview__children">
                    <li v-for="child in root.children" :key="child.name" class="category-plan-preview__child">
                        <span
                            class="category-plan-preview__icon category-plan-preview__icon--sm"
                            :class="{ 'category-plan-preview__icon--empty': !(child.color || root.color) }"
                            :style="(child.color || root.color) ? { backgroundColor: child.color || root.color } : undefined"
                        >
                            <component :is="resolveCategoryIcon(child.icone || root.icone)" size="14" stroke-width="1.8" />
                        </span>
                        <span>{{ child.name }}</span>
                    </li>
                </ul>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="applying" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="applying || store.acting" @click="onApply">
                <span v-if="applying" class="su-spin" />
                {{ t('categoriesPage.plan.modal.apply') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.category-plan-preview {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.category-plan-preview__group {
    padding: 12px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 14px;
    background: rgba(var(--v-theme-on-surface), 0.02);
}

.category-plan-preview__root,
.category-plan-preview__child {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.category-plan-preview__name {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 600;
    letter-spacing: -0.01em;
}

.category-plan-preview__badge {
    flex: none;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.category-plan-preview__badge.is-depense {
    color: #b45309;
    background: rgba(245, 158, 11, 0.14);
}

.category-plan-preview__badge.is-revenu {
    color: #047857;
    background: rgba(16, 185, 129, 0.14);
}

.category-plan-preview__badge.is-transfert {
    color: #4338ca;
    background: rgba(79, 70, 229, 0.14);
}

.category-plan-preview__badge.is-mixte {
    color: rgba(var(--v-theme-on-surface), 0.7);
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.category-plan-preview__children {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0 0;
    padding: 0 0 0 12px;
    list-style: none;
    border-left: 2px solid rgba(var(--v-border-color), 0.45);
}

.category-plan-preview__child {
    color: rgba(var(--v-theme-on-surface), 0.82);
    font-size: 0.925rem;
}

.category-plan-preview__icon {
    display: grid;
    flex: none;
    width: 28px;
    height: 28px;
    place-items: center;
    color: #fff;
    border-radius: 9px;
}

.category-plan-preview__icon--sm {
    width: 22px;
    height: 22px;
    border-radius: 7px;
}

.category-plan-preview__icon--empty {
    color: rgba(var(--v-theme-on-surface), 0.55);
    background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
