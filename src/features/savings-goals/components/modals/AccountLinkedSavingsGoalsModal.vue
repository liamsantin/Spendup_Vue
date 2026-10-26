<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { formatSavingsGoalAmount } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import type { SavingsGoal } from '@/features/savings-goals/types';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    cleared: [];
}>();

const { t, locale } = useI18n();
const store = useSavingsGoalsStore();

const linked = ref<SavingsGoal[]>([]);
const localError = ref<string | null>(null);
const loading = ref(false);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const hasLinked = computed(() => linked.value.length > 0);

async function reload() {
    const id = props.accountPublicId?.trim();
    if (!id) {
        linked.value = [];
        return;
    }
    loading.value = true;
    localError.value = null;
    try {
        linked.value = await store.listLinkedToAccount(id);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        linked.value = [];
    } finally {
        loading.value = false;
    }
}

watch(
    () => [props.modelValue, props.accountPublicId] as const,
    ([isOpen]) => {
        if (!isOpen) return;
        void reload();
    }
);

async function unlink(goal: SavingsGoal) {
    localError.value = null;
    try {
        await store.unlinkSavingsGoalAccount(goal.publicId);
        linked.value = linked.value.filter((item) => item.publicId !== goal.publicId);
        if (!linked.value.length) emit('cleared');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('savingsGoalsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            linked.value = linked.value.filter((item) => item.publicId !== goal.publicId);
        }
    }
}

async function remove(goal: SavingsGoal) {
    localError.value = null;
    try {
        await store.deleteSavingsGoal(goal.publicId);
        linked.value = linked.value.filter((item) => item.publicId !== goal.publicId);
        if (!linked.value.length) emit('cleared');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('savingsGoalsPage.errors.notFound') : getErrorMessage(e);
        if (err.status === 404) {
            linked.value = linked.value.filter((item) => item.publicId !== goal.publicId);
            if (!linked.value.length) emit('cleared');
        }
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('savingsGoalsPage.linkedAccount.title')"
        :subtitle="t('savingsGoalsPage.linkedAccount.subtitle')"
        :max-width="520"
        :height="560"
        scrollable
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div v-if="loading && !linked.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <p v-else-if="!hasLinked" class="linked-goals__empty">
            {{ t('savingsGoalsPage.linkedAccount.empty') }}
        </p>
        <ul v-else class="linked-goals">
            <li v-for="goal in linked" :key="goal.publicId" class="linked-goals__item">
                <div class="linked-goals__meta">
                    <strong>{{ goal.name }}</strong>
                    <span>
                        {{
                            t('savingsGoalsPage.list.savedOf', {
                                current: formatSavingsGoalAmount(goal.currentAmount, goal.currency, locale),
                                target: formatSavingsGoalAmount(goal.targetAmount, goal.currency, locale)
                            })
                        }}
                    </span>
                </div>
                <div class="linked-goals__actions">
                    <button type="button" class="su-btn su-btn--sm" :disabled="store.acting" @click="unlink(goal)">
                        {{ t('savingsGoalsPage.linkedAccount.unlink') }}
                    </button>
                    <button type="button" class="su-btn su-btn--sm su-btn--danger" :disabled="store.acting" @click="remove(goal)">
                        {{ t('savingsGoalsPage.actions.delete') }}
                    </button>
                </div>
            </li>
        </ul>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="close">
                {{ t('common.close') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.linked-goals__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

/* lignes sur filets fins : nom 700 + sous-ligne grise | actions */
.linked-goals {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--line);
}

.linked-goals__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.linked-goals > .linked-goals__item:first-child {
    border-top: 0;
}

.linked-goals__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.linked-goals__meta strong {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.linked-goals__meta span {
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.linked-goals__actions {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
}

@media (max-width: 599.98px) {
    .linked-goals__item {
        flex-direction: column;
        align-items: stretch;
    }

    .linked-goals__actions {
        justify-content: flex-start;
    }
}
</style>
