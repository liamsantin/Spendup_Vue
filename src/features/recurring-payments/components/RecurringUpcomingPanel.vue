<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import {
    addMonthsYmd,
    displayDueStatus,
    formatCalendarDate,
    formatPlannedAmount,
    todayLocalYmd
} from '@/features/recurring-payments/format';
import { recurringExpensesApi, recurringIncomesApi } from '@/features/recurring-payments/api';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type { RecurringDue, RecurringKind } from '@/features/recurring-payments/types';

type UpcomingRow = {
    kind: RecurringKind;
    templatePublicId: string;
    templateName: string;
    accountPublicId: string;
    currency: string;
    due: RecurringDue;
};

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();
const store = useRecurringPaymentsStore();
const loading = ref(false);
const localError = ref<string | null>(null);
const rows = ref<UpcomingRow[]>([]);
const detailKind = ref<RecurringKind>('expense');
const detailId = ref<string | null>(null);

const detailOpen = computed({
    get: () => !!detailId.value,
    set: (value: boolean) => {
        if (!value) detailId.value = null;
    }
});

async function loadUpcoming() {
    loading.value = true;
    localError.value = null;
    try {
        await accountsStore.loadAccounts();
        const from = todayLocalYmd();
        const to = addMonthsYmd(from, 3);
        await Promise.all([
            store.loadExpenses({ from, to, pageSize: 200, force: true }),
            store.loadIncomes({ from, to, pageSize: 200, force: true })
        ]);

        const next: UpcomingRow[] = [];
        const expenses = store.expenses.filter((item) => item.nextDueDate && item.nextDueDate >= from && item.nextDueDate <= to);
        const incomes = store.incomes.filter((item) => item.nextDueDate && item.nextDueDate >= from && item.nextDueDate <= to);

        const expenseDues = await Promise.all(
            expenses.map(async (item) => {
                const list = await recurringExpensesApi.listDues(item.publicId, { from, to, pageSize: 200 });
                return { item, dues: list.items ?? [] };
            })
        );
        for (const { item, dues } of expenseDues) {
            for (const due of dues) {
                next.push({
                    kind: 'expense',
                    templatePublicId: item.publicId,
                    templateName: item.name,
                    accountPublicId: item.accountPublicId,
                    currency: item.currency,
                    due
                });
            }
        }

        const incomeDues = await Promise.all(
            incomes.map(async (item) => {
                const list = await recurringIncomesApi.listDues(item.publicId, { from, to, pageSize: 200 });
                return { item, dues: list.items ?? [] };
            })
        );
        for (const { item, dues } of incomeDues) {
            for (const due of dues) {
                next.push({
                    kind: 'income',
                    templatePublicId: item.publicId,
                    templateName: item.name,
                    accountPublicId: item.accountPublicId,
                    currency: item.currency,
                    due
                });
            }
        }

        next.sort((a, b) => a.due.scheduledAt.localeCompare(b.due.scheduledAt) || a.templateName.localeCompare(b.templateName));
        rows.value = next;
    } catch (e: unknown) {
        localError.value = AppError.fromUnknown(e).status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    void loadUpcoming();
});

function accountName(id: string) {
    return accountsStore.accounts.find((item) => item.publicId === id)?.name ?? t('recurrencesPage.unknownAccount');
}

function openRow(row: UpcomingRow) {
    detailKind.value = row.kind;
    detailId.value = row.templatePublicId;
}
</script>

<template>
    <div>
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <div v-if="loading && !rows.length" class="su-loading"><span class="su-spin" /></div>
        <div v-else-if="!rows.length" class="su-empty">{{ t('recurrencesPage.empty.upcoming') }}</div>
        <v-list v-else class="py-0">
            <button
                v-for="row in rows"
                :key="`${row.kind}-${row.due.publicId}`"
                type="button"
                class="su-person recurring-upcoming-row"
                @click="openRow(row)"
            >
                <div class="su-person__meta">
                    <p class="su-person__name">{{ row.templateName }}</p>
                    <p class="su-person__sub">
                        {{ formatCalendarDate(row.due.scheduledAt, locale) }} · {{ accountName(row.accountPublicId) }} ·
                        {{ t(`recurrencesPage.kinds.${row.kind}`) }}
                    </p>
                    <p class="su-person__sub">
                        {{ t(`recurrencesPage.dueStatuses.${displayDueStatus(row.due, row.kind)}`) }} ·
                        {{ formatPlannedAmount(row.due.plannedAmount, row.currency, locale) }}
                    </p>
                </div>
            </button>
        </v-list>

        <RecurringTemplateDetailModal v-model="detailOpen" :kind="detailKind" :public-id="detailId" />
    </div>
</template>

<style scoped>
.recurring-upcoming-row {
    width: 100%;
    text-align: left;
    cursor: pointer;
}
</style>
