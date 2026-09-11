<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringTemplateListItem from '@/features/recurring-payments/components/list/RecurringTemplateListItem.vue';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import RecurringTemplateFormModal from '@/features/recurring-payments/components/modals/RecurringTemplateFormModal.vue';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        kind: RecurringKind;
        showInactive?: boolean;
    }>(),
    { showInactive: true }
);

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const store = useRecurringPaymentsStore();

const createOpen = ref(false);
const editTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const deleteTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const detailId = ref<string | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});
const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});
const detailOpen = computed({
    get: () => !!detailId.value,
    set: (value: boolean) => {
        if (!value) detailId.value = null;
    }
});

function accountFromQuery(): string | null {
    const raw = route.query.account;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => accountFromQuery());
const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));

const items = computed(() => {
    const list = props.kind === 'expense' ? store.expenses : store.incomes;
    const filtered = props.showInactive ? list : list.filter((item) => item.isActive);
    const accountId = filterAccountId.value;
    return accountId ? filtered.filter((item) => item.accountPublicId === accountId) : filtered;
});

const loading = computed(() => (props.kind === 'expense' ? store.loadingExpenses : store.loadingIncomes));
const hasMore = computed(() => (props.kind === 'expense' ? store.hasMoreExpenses : store.hasMoreIncomes));
const loadingMore = computed(() => (props.kind === 'expense' ? store.loadingMoreExpenses : store.loadingMoreIncomes));

async function loadList(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        if (props.kind === 'expense') {
            await store.loadExpenses({ accountPublicId: filterAccountId.value ?? undefined, force });
        } else {
            await store.loadIncomes({ accountPublicId: filterAccountId.value ?? undefined, force });
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('recurrencesPage.errors.notFound');
            if (filterAccountId.value) await router.replace({ path: '/app/finances/recurrences' });
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadList(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadList().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [route.query.account, props.kind] as const,
    () => {
        void loadList().catch(() => undefined);
    }
);

function openCreate() {
    if (!canCreate.value) return;
    createOpen.value = true;
}

defineExpose({ openCreate });

function canWrite(accountPublicId: string) {
    const account = accountsStore.accounts.find((item) => item.publicId === accountPublicId);
    return account ? canWriteRecurringOnAccount(account) : false;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        if (props.kind === 'expense') await store.deleteExpense(deleteTarget.value.publicId);
        else await store.deleteIncome(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onSaved(template: RecurringExpense | RecurringIncome) {
    detailId.value = template.publicId;
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

        <div v-if="loading && !items.length" class="su-loading"><span class="su-spin" /></div>
        <div v-else-if="!items.length" class="su-empty">
            {{ kind === 'expense' ? t('recurrencesPage.empty.expenses') : t('recurrencesPage.empty.incomes') }}
        </div>
        <v-list v-else class="py-0">
            <RecurringTemplateListItem
                v-for="item in items"
                :key="item.publicId"
                :template="item"
                :kind="kind"
                :can-write="canWrite(item.accountPublicId)"
                :acting="store.acting"
                @open="detailId = $event.publicId"
                @edit="editTarget = $event"
                @delete="deleteTarget = $event"
            />
        </v-list>

        <div v-if="hasMore" class="su-more">
            <button
                type="button"
                class="su-btn su-btn--ghost"
                :disabled="loadingMore"
                @click="kind === 'expense' ? store.loadMoreExpenses() : store.loadMoreIncomes()"
            >
                {{ t('recurrencesPage.loadMore') }}
            </button>
        </div>

        <RecurringTemplateFormModal v-model="createOpen" :kind="kind" :default-account-public-id="filterAccountId" @saved="onSaved" />
        <RecurringTemplateFormModal v-model="editOpen" :kind="kind" :template="editTarget" />
        <RecurringTemplateDetailModal
            v-model="detailOpen"
            :kind="kind"
            :public-id="detailId"
            @edit="
                editTarget = (
                    kind === 'expense' ? store.getDetail('expense', detailId || '') : store.getDetail('income', detailId || '')
                ) as RecurringExpense | RecurringIncome | null
            "
        />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="kind === 'expense' ? t('recurrencesPage.deleteModal.expenseTitle') : t('recurrencesPage.deleteModal.incomeTitle')"
            :message="t('recurrencesPage.deleteModal.body')"
            :confirm-label="t('recurrencesPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>
