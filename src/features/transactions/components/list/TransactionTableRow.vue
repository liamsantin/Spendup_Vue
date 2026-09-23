<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { MinusIcon, PaperclipIcon, PencilIcon, PlusIcon, RepeatIcon, TrashIcon } from 'vue-tabler-icons';
import { useTransactionRowDisplay } from '@/features/transactions/composables/useTransactionRowDisplay';
import { formatOperationDate } from '@/features/transactions/format';
import TagChips from '@/features/tags/components/list/TagChips.vue';
import type { Transaction } from '@/features/transactions/types';

const props = defineProps<{
    transaction: Transaction;
    canWrite: boolean;
    acting?: boolean;
    statementAccountPublicId?: string | null;
    envelopeAction?: 'add' | 'remove' | null;
}>();

const emit = defineEmits<{
    edit: [transaction: Transaction];
    delete: [transaction: Transaction];
    envelope: [transaction: Transaction];
}>();

const { t, locale } = useI18n();

const { typeIcon, amountDisplay, amountTone, amountVariance, plannedAmountLabel, deltaAmountLabel, accountLine, categoryLabel, tierLabel } =
    useTransactionRowDisplay(toRef(props, 'transaction'), toRef(props, 'statementAccountPublicId'));

function onDoubleClick(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('edit', props.transaction);
}
</script>

<template>
    <tr
        class="app-data-table__row transaction-table__row"
        :class="`is-${transaction.type}`"
        :data-transaction-id="transaction.publicId"
        @dblclick="onDoubleClick"
    >
        <td>
            <div class="app-data-table__name">
                <span class="app-data-table__avatar">
                    <component :is="typeIcon" :size="16" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ transaction.label }}</span>
                    <span
                        v-if="transaction.source === 'recurrence' || transaction.files?.length"
                        class="app-data-table__muted transaction-table__flags"
                    >
                        <span v-if="transaction.source === 'recurrence'" class="transaction-table__flag">
                            <RepeatIcon :size="12" stroke-width="1.8" />
                            {{ t('transactionsPage.list.sourceRecurrence') }}
                        </span>
                        <span
                            v-if="transaction.files?.length"
                            class="transaction-table__flag"
                            :title="
                                t('transactionsPage.list.hasAttachments', { count: transaction.files.length }, transaction.files.length)
                            "
                        >
                            <PaperclipIcon :size="12" stroke-width="1.8" />
                            {{ transaction.files.length }}
                        </span>
                    </span>
                </span>
            </div>
        </td>
        <td>{{ formatOperationDate(transaction.operationDate, locale) }}</td>
        <td :title="accountLine">{{ accountLine }}</td>
        <td>
            <span v-if="categoryLabel">{{ categoryLabel }}</span>
            <span v-else class="app-data-table__muted">—</span>
            <TagChips :tag-public-ids="transaction.tagPublicIds" compact class="transaction-table__tags" />
        </td>
        <td>
            <span v-if="tierLabel">{{ tierLabel }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span class="app-data-table__identity">
                <span class="app-data-table__strong transaction-table__amount" :class="amountTone">{{ amountDisplay.text }}</span>
                <span
                    v-if="amountVariance"
                    class="transaction-table__delta"
                    :class="`is-${amountVariance.tone}`"
                    :title="t('transactionsPage.list.recurrenceDelta', { delta: deltaAmountLabel, planned: plannedAmountLabel })"
                >
                    {{ deltaAmountLabel }}
                </span>
            </span>
        </td>
        <td class="app-data-table__actions-cell" @click.stop>
            <div v-if="canWrite" class="app-data-table__actions">
                <button
                    v-if="envelopeAction"
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="envelopeAction === 'add' ? t('transactionsPage.envelope.add') : t('transactionsPage.envelope.remove')"
                    @click="emit('envelope', transaction)"
                >
                    <PlusIcon v-if="envelopeAction === 'add'" :size="16" stroke-width="1.6" />
                    <MinusIcon v-else :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.edit')"
                    @click="emit('edit', transaction)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.delete')"
                    @click="emit('delete', transaction)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
        </td>
    </tr>
</template>

<style scoped>
.transaction-table__row.is-depense {
    --tint: rgb(var(--amount-debit));
}

.transaction-table__row.is-revenu {
    --tint: rgb(var(--amount-credit));
}

.transaction-table__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.transaction-table__amount.is-credit {
    color: rgb(var(--amount-credit));
}

.transaction-table__flags {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.transaction-table__flag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

.transaction-table__delta {
    font-size: 0.72rem;
    font-weight: 600;
}

.transaction-table__delta.is-favorable {
    color: rgb(var(--amount-credit));
}

.transaction-table__delta.is-unfavorable {
    color: rgb(var(--amount-debit));
}

.transaction-table__tags {
    display: flex;
    margin-top: 4px;
}
</style>
