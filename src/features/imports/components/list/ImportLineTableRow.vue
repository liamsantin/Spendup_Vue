<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ImportLineActions from '@/features/imports/components/list/ImportLineActions.vue';
import ImportLineBadges from '@/features/imports/components/list/ImportLineBadges.vue';
import ImportStatusChip from '@/features/imports/components/list/ImportStatusChip.vue';
import { useImportLineDisplay } from '@/features/imports/composables/useImportLineDisplay';
import type { ImportLine } from '@/features/imports/types';

const props = defineProps<{
    line: ImportLine;
    currency?: string | null;
    editable: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    validate: [line: ImportLine];
    ignore: [line: ImportLine];
    restore: [line: ImportLine];
    edit: [line: ImportLine];
}>();

const { t } = useI18n();

const { dateLabel, amountText, amountTone, categoryLabel, tierLabel, paymentMethodLabel, labelText, badges } = useImportLineDisplay(
    toRef(props, 'line'),
    toRef(props, 'currency')
);

function onDoubleClick(event: MouseEvent) {
    if (!props.editable || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('edit', props.line);
}
</script>

<template>
    <tr
        class="app-data-table__row import-line-row"
        :class="[`is-${line.status}`, { 'is-muted': line.status === 'ignoree' }]"
        :data-line-id="line.publicId"
        @dblclick="onDoubleClick"
    >
        <td class="import-line-row__number">{{ line.lineNumber }}</td>
        <td :class="{ 'import-line-row__missing': !line.operationDate }">{{ dateLabel }}</td>
        <td>
            <span class="app-data-table__identity">
                <span class="app-data-table__title" :title="labelText">{{ labelText }}</span>
                <ImportLineBadges
                    class="import-line-row__badges"
                    :badges="badges"
                    :line="line"
                    :currency="currency"
                    :editable="editable && !acting"
                />
            </span>
        </td>
        <td>
            <span v-if="categoryLabel" :title="categoryLabel">{{ categoryLabel }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span v-if="tierLabel" :class="{ 'app-data-table__muted': !line.tierPublicId }" :title="tierLabel">{{ tierLabel }}</span>
            <span v-else class="app-data-table__muted">—</span>
            <span
                v-if="paymentMethodLabel"
                class="import-line-row__sub app-data-table__muted"
                :title="`${t('importsPage.fields.paymentMethod')} : ${paymentMethodLabel}`"
            >
                {{ paymentMethodLabel }}
            </span>
        </td>
        <td>
            <span class="app-data-table__strong import-line-row__amount" :class="amountTone">{{ amountText }}</span>
        </td>
        <td><ImportStatusChip :status="line.status" kind="line" /></td>
        <td class="app-data-table__actions-cell" @click.stop>
            <ImportLineActions
                v-if="editable"
                class="app-data-table__actions"
                :line="line"
                :acting="acting"
                @validate="emit('validate', $event)"
                @ignore="emit('ignore', $event)"
                @restore="emit('restore', $event)"
                @edit="emit('edit', $event)"
            />
            <span v-else-if="line.transactionPublicId" class="app-data-table__muted">{{ t('importsPage.lines.created') }}</span>
        </td>
    </tr>
</template>

<style scoped>
.import-line-row__number {
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
}

.import-line-row__missing {
    color: rgb(var(--v-theme-error));
}

.import-line-row__amount {
    font-variant-numeric: tabular-nums;
}

.import-line-row__sub {
    display: block;
    overflow: hidden;
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-line-row__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.import-line-row__amount.is-credit {
    color: rgb(var(--amount-credit));
}

.import-line-row__badges {
    margin-top: 3px;
}
</style>
