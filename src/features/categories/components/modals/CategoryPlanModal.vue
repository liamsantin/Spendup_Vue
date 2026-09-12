<script setup lang="ts">
/**
 * Boutique de domaines du plan de catégories : sélection libre puis application.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAccordion from '@/components/shared/accordion/AppAccordion.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
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
/** Clés `nameKey` des domaines cochés. */
const selectedKeys = ref<string[]>([]);
/** Ouverture des accordéons par domaine. */
const expandedByKey = reactive<Record<string, boolean>>({});

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

type ShopChild = {
    name: string;
    type: CategoryPlanNodeDef['type'];
    color?: string;
    icone?: string;
};

type ShopItem = {
    nameKey: string;
    name: string;
    type: CategoryPlanNodeDef['type'];
    color?: string;
    icone?: string;
    children: ShopChild[];
    alreadyPresent: boolean;
};

function normalizeLabel(value: string): string {
    return value.trim().toLowerCase();
}

function rootAlreadyPresent(name: string, type: CategoryPlanNodeDef['type']): boolean {
    const needle = normalizeLabel(name);
    return store.items.some((item) => item.type === type && normalizeLabel(item.name) === needle);
}

const shopItems = computed<ShopItem[]>(() =>
    DEFAULT_CATEGORY_PLAN.map((root) => {
        const name = t(`categoriesPage.plan.nodes.${root.nameKey}`);
        return {
            nameKey: root.nameKey,
            name,
            type: root.type,
            color: root.color,
            icone: root.icone,
            children: (root.children ?? []).map((child) => ({
                name: t(`categoriesPage.plan.nodes.${child.nameKey}`),
                type: child.type ?? root.type,
                color: child.color,
                icone: child.icone
            })),
            alreadyPresent: rootAlreadyPresent(name, root.type)
        };
    })
);

const selectedCount = computed(() => selectedKeys.value.length);
const allSelected = computed(() => shopItems.value.length > 0 && selectedKeys.value.length === shopItems.value.length);

const applyLabel = computed(() => {
    const count = selectedCount.value;
    if (count <= 0) return t('categoriesPage.plan.modal.applyNone');
    return t('categoriesPage.plan.modal.apply', { count }, count);
});

const selectedLabel = computed(() => t('categoriesPage.plan.modal.selected', { count: selectedCount.value }, selectedCount.value));

const busy = computed(() => applying.value || store.acting);

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        localError.value = null;
        selectedKeys.value = [];
        for (const key of Object.keys(expandedByKey)) {
            delete expandedByKey[key];
        }
    }
);

function isSelected(nameKey: string): boolean {
    return selectedKeys.value.includes(nameKey);
}

function itemSubtitle(item: ShopItem): string {
    if (item.alreadyPresent) return t('categoriesPage.plan.modal.alreadyPresent');
    return t('categoriesPage.plan.modal.childCount', { count: item.children.length }, item.children.length);
}

function setSelected(nameKey: string, value: boolean | null) {
    if (busy.value) return;
    if (value) {
        if (!isSelected(nameKey)) selectedKeys.value = [...selectedKeys.value, nameKey];
        return;
    }
    selectedKeys.value = selectedKeys.value.filter((key) => key !== nameKey);
}

function selectAll() {
    selectedKeys.value = shopItems.value.map((item) => item.nameKey);
}

function selectNone() {
    selectedKeys.value = [];
}

async function onApply() {
    if (busy.value || selectedCount.value === 0) return;
    applying.value = true;
    localError.value = null;
    store.clearError();
    try {
        const selected = new Set(selectedKeys.value);
        const nodes = shopItems.value
            .filter((item) => selected.has(item.nameKey))
            .map(({ name, type, color, icone, children }) => ({ name, type, color, icone, children }));
        await store.applyCategoryPlan(nodes);
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
        :max-width="640"
        :height="720"
        mobile-layout="sheet"
    >
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="mb-4"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <p class="text-body-2 text-medium-emphasis mb-3">
            {{ t('categoriesPage.plan.modal.intro') }}
        </p>

        <div class="category-plan-shop__toolbar">
            <span class="category-plan-shop__count">
                {{ selectedLabel }}
            </span>
            <div class="category-plan-shop__toolbar-actions">
                <button type="button" class="su-btn su-btn--ghost" :disabled="busy || allSelected" @click="selectAll">
                    {{ t('categoriesPage.plan.modal.selectAll') }}
                </button>
                <button type="button" class="su-btn su-btn--ghost" :disabled="busy || selectedCount === 0" @click="selectNone">
                    {{ t('categoriesPage.plan.modal.selectNone') }}
                </button>
            </div>
        </div>

        <div class="category-plan-shop" role="list">
            <div
                v-for="item in shopItems"
                :key="item.nameKey"
                class="category-plan-shop__row"
                :class="{ 'is-selected': isSelected(item.nameKey) }"
                role="listitem"
            >
                <div class="category-plan-shop__check">
                    <AppCheckbox
                        :model-value="isSelected(item.nameKey)"
                        density="compact"
                        :disabled="busy"
                        :aria-label="t('categoriesPage.plan.modal.selectDomain', { name: item.name })"
                        @update:model-value="(value) => setSelected(item.nameKey, value)"
                    />
                </div>

                <AppAccordion
                    v-model="expandedByKey[item.nameKey]"
                    class="category-plan-shop__accordion"
                    :class="{ 'is-selected': isSelected(item.nameKey) }"
                    :subtitle="itemSubtitle(item)"
                    :disabled="busy"
                >
                    <template #title>
                        <span class="category-plan-shop__title">
                            <span
                                class="category-plan-shop__icon"
                                :class="{ 'category-plan-shop__icon--empty': !item.color }"
                                :style="item.color ? { backgroundColor: item.color } : undefined"
                                aria-hidden="true"
                            >
                                <component :is="resolveCategoryIcon(item.icone)" size="16" stroke-width="1.8" />
                            </span>
                            <span class="category-plan-shop__name">{{ item.name }}</span>
                        </span>
                    </template>

                    <template #extra>
                        <span class="category-plan-shop__badge" :class="`is-${item.type}`">
                            {{ t(`categoriesPage.types.${item.type}`) }}
                        </span>
                    </template>

                    <ul v-if="item.children.length" class="category-plan-shop__children">
                        <li v-for="child in item.children" :key="child.name" class="category-plan-shop__child">
                            <span
                                class="category-plan-shop__icon category-plan-shop__icon--sm"
                                :class="{ 'category-plan-shop__icon--empty': !(child.color || item.color) }"
                                :style="child.color || item.color ? { backgroundColor: child.color || item.color } : undefined"
                                aria-hidden="true"
                            >
                                <component :is="resolveCategoryIcon(child.icone || item.icone)" size="14" stroke-width="1.8" />
                            </span>
                            <span>{{ child.name }}</span>
                        </li>
                    </ul>
                    <p v-else class="category-plan-shop__empty-children text-body-2 text-medium-emphasis">
                        {{ t('categoriesPage.plan.modal.noChildren') }}
                    </p>
                </AppAccordion>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="applying" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="busy || selectedCount === 0" @click="onApply">
                <span v-if="applying" class="su-spin" />
                {{ applyLabel }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.category-plan-shop__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    margin-bottom: 12px;
}

.category-plan-shop__count {
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: rgba(var(--v-theme-on-surface), 0.72);
}

.category-plan-shop__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.category-plan-shop {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.category-plan-shop__row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.category-plan-shop__check {
    flex: none;
    margin-top: 10px;
}

.category-plan-shop__accordion {
    flex: 1 1 auto;
    min-width: 0;
}

.category-plan-shop__accordion.is-selected {
    border-color: rgba(var(--v-theme-primary), 0.45);
    box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.75) inset,
        inset 0 0 0 1px rgba(var(--v-theme-primary), 0.18);
    background: rgba(var(--v-theme-primary), 0.06);
}

.category-plan-shop__title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.category-plan-shop__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.category-plan-shop__badge {
    flex: none;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.category-plan-shop__badge.is-depense {
    color: #b45309;
    background: rgba(245, 158, 11, 0.14);
}

.category-plan-shop__badge.is-revenu {
    color: #047857;
    background: rgba(16, 185, 129, 0.14);
}

.category-plan-shop__badge.is-transfert {
    color: #4338ca;
    background: rgba(79, 70, 229, 0.14);
}

.category-plan-shop__badge.is-mixte {
    color: rgba(var(--v-theme-on-surface), 0.7);
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.category-plan-shop__children {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.category-plan-shop__child {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: rgba(var(--v-theme-on-surface), 0.84);
    font-size: 0.925rem;
}

.category-plan-shop__empty-children {
    margin: 0;
}

.category-plan-shop__icon {
    display: grid;
    flex: none;
    width: 28px;
    height: 28px;
    place-items: center;
    color: #fff;
    border-radius: 9px;
}

.category-plan-shop__icon--sm {
    width: 22px;
    height: 22px;
    border-radius: 7px;
}

.category-plan-shop__icon--empty {
    color: rgba(var(--v-theme-on-surface), 0.55);
    background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
