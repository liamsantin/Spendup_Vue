<script setup lang="ts">
/**
 * Journal des opérations d'un compte de placement (plus récent d'abord) : filtres instrument / type / période,
 * tableau éditorial, menu Modifier / Supprimer (propriétaire), « Charger plus ».
 * Les filtres sont détenus par le parent (`filters` + émission `filter`).
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon, DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    formatCalendarDate,
    formatPrice,
    formatQuantity,
    formatSignedMoney,
    isOperationType,
    operationNeedsQuantity,
    operationSignedAmount
} from '@/features/investments/format';
import type { OperationsFilters, OperationsPage } from '@/features/investments/stores/internal/investments-state';
import { OPERATION_TYPES, type Instrument, type InvestmentOperation } from '@/features/investments/types';

const props = withDefaults(
    defineProps<{
        page: OperationsPage | null;
        filters: OperationsFilters;
        /** Instruments proposés dans le filtre (positions du compte + instruments déjà vus). */
        instruments: Instrument[];
        loading?: boolean;
        acting?: boolean;
        canWrite?: boolean;
    }>(),
    {
        loading: false,
        acting: false,
        canWrite: false
    }
);

const emit = defineEmits<{
    filter: [filters: OperationsFilters];
    loadMore: [];
    edit: [operation: InvestmentOperation];
    delete: [operation: InvestmentOperation];
}>();

const { t, locale } = useI18n();

const items = computed(() => props.page?.items ?? []);
const hasFilters = computed(() => !!(props.filters.instrumentPublicId || props.filters.type || props.filters.from || props.filters.to));
const periodCount = computed(() => [props.filters.from, props.filters.to].filter(Boolean).length);

const instrumentItems = computed(() => [
    { title: t('investmentsPage.operations.filters.allInstruments'), value: '' },
    ...props.instruments.map((instrument) => ({ title: `${instrument.symbol} · ${instrument.name}`, value: instrument.publicId }))
]);

const typeItems = computed(() => [
    { title: t('investmentsPage.operations.filters.allTypes'), value: '' },
    ...OPERATION_TYPES.map((type) => ({ title: t(`investmentsPage.operationTypes.${type}`), value: type }))
]);

function patch(next: Partial<OperationsFilters>) {
    emit('filter', { ...props.filters, ...next });
}

const instrumentModel = computed({
    get: () => props.filters.instrumentPublicId ?? '',
    set: (value: string) => patch({ instrumentPublicId: value || null })
});

const typeModel = computed({
    get: () => props.filters.type ?? '',
    set: (value: string) => patch({ type: isOperationType(value) ? value : null })
});

const fromModel = computed({
    get: () => props.filters.from,
    set: (value: string | null) => patch({ from: value || null })
});

const toModel = computed({
    get: () => props.filters.to,
    set: (value: string | null) => patch({ to: value || null })
});

const periodLabel = computed(() => {
    const { from, to } = props.filters;
    if (from && to) {
        return t('investmentsPage.operations.filters.periodRange', {
            from: formatCalendarDate(from, locale.value),
            to: formatCalendarDate(to, locale.value)
        });
    }
    if (from) return t('investmentsPage.operations.filters.periodFrom', { date: formatCalendarDate(from, locale.value) });
    if (to) return t('investmentsPage.operations.filters.periodTo', { date: formatCalendarDate(to, locale.value) });
    return t('investmentsPage.operations.filters.period');
});

function resetAll() {
    emit('filter', { instrumentPublicId: null, type: null, from: null, to: null });
}

function amountText(operation: InvestmentOperation): string {
    return formatSignedMoney(operationSignedAmount(operation), operation.currency, locale.value);
}

function amountClass(operation: InvestmentOperation): string {
    const value = operationSignedAmount(operation);
    if (value === 0) return '';
    return value > 0 ? 'su-pos' : 'su-neg';
}
</script>

<template>
    <section class="su-section operations">
        <header class="su-section__head operations__head">
            <h2>{{ t('investmentsPage.operations.title') }}</h2>
            <span v-if="page && page.totalCount" class="operations__count">
                {{ t('investmentsPage.operations.count', { count: page.totalCount }, page.totalCount) }}
            </span>
        </header>

        <div class="operations__filters">
            <div class="operations__filter">
                <AppSelect
                    v-model="instrumentModel"
                    :items="instrumentItems"
                    :label="t('investmentsPage.operations.filters.instrument')"
                    searchable
                    hide-details
                />
            </div>
            <div class="operations__filter">
                <AppSelect v-model="typeModel" :items="typeItems" :label="t('investmentsPage.operations.filters.type')" hide-details />
            </div>
            <AppDropdownFilter
                :label="periodLabel"
                :icon="CalendarIcon"
                :min-width="300"
                :count="periodCount"
                :reset-disabled="!periodCount"
                @reset="patch({ from: null, to: null })"
            >
                <div class="pa-3 d-flex flex-column ga-3">
                    <AppDatePicker
                        v-model="fromModel"
                        :label="t('investmentsPage.operations.filters.from')"
                        :max="filters.to || undefined"
                    />
                    <AppDatePicker v-model="toModel" :label="t('investmentsPage.operations.filters.to')" :min="filters.from || undefined" />
                </div>
            </AppDropdownFilter>
            <button v-if="hasFilters" type="button" class="su-btn su-btn--ghost" @click="resetAll">
                {{ t('investmentsPage.operations.filters.reset') }}
            </button>
        </div>

        <div v-if="loading && !items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!items.length" class="su-empty">
            <p>{{ hasFilters ? t('investmentsPage.operations.emptyFiltered') : t('investmentsPage.operations.empty') }}</p>
        </div>
        <template v-else>
            <div class="su-table-wrap">
                <table class="su-table operations__table">
                    <thead>
                        <tr>
                            <th scope="col">{{ t('investmentsPage.operations.columns.date') }}</th>
                            <th scope="col">{{ t('investmentsPage.operations.columns.instrument') }}</th>
                            <th scope="col">{{ t('investmentsPage.operations.columns.type') }}</th>
                            <th scope="col" class="is-num">{{ t('investmentsPage.operations.columns.quantity') }}</th>
                            <th scope="col" class="is-num">{{ t('investmentsPage.operations.columns.unitPrice') }}</th>
                            <th scope="col" class="is-num">{{ t('investmentsPage.operations.columns.amount') }}</th>
                            <th v-if="canWrite" scope="col" class="operations__actions-col">
                                <span class="operations__sr">{{ t('investmentsPage.operations.columns.actions') }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="operation in items" :key="operation.publicId">
                            <td class="operations__date">{{ formatCalendarDate(operation.operationDate, locale) }}</td>
                            <td>
                                <div class="operations__instrument">
                                    <span class="operations__symbol">{{ operation.instrument.symbol }}</span>
                                    <span class="operations__sub">{{ operation.instrument.name }}</span>
                                    <span v-if="operation.notes" class="operations__sub operations__notes">{{ operation.notes }}</span>
                                </div>
                            </td>
                            <td>{{ t(`investmentsPage.operationTypes.${operation.type}`) }}</td>
                            <td class="is-num">
                                {{
                                    operationNeedsQuantity(operation.type) && operation.quantity != null
                                        ? formatQuantity(operation.quantity, locale)
                                        : t('common.emptyValue')
                                }}
                            </td>
                            <td class="is-num">
                                {{
                                    operationNeedsQuantity(operation.type) && operation.unitPrice != null
                                        ? formatPrice(operation.unitPrice, operation.currency, locale)
                                        : t('common.emptyValue')
                                }}
                            </td>
                            <td class="is-num">
                                <span class="operations__amount" :class="amountClass(operation)">{{ amountText(operation) }}</span>
                            </td>
                            <td v-if="canWrite">
                                <div class="operations__actions">
                                    <v-menu location="bottom end" :offset="4">
                                        <template #activator="{ props: menuProps }">
                                            <button
                                                v-bind="menuProps"
                                                type="button"
                                                class="su-orb"
                                                :disabled="acting"
                                                :aria-label="t('investmentsPage.operations.menu', { symbol: operation.instrument.symbol })"
                                            >
                                                <DotsIcon :size="18" stroke-width="1.75" />
                                            </button>
                                        </template>
                                        <v-sheet class="su-menu operations-menu">
                                            <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', operation)">
                                                <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                                                <span class="su-menu-item__title">{{ t('investmentsPage.actions.edit') }}</span>
                                            </button>
                                            <button
                                                type="button"
                                                class="su-menu-item operations-menu__delete"
                                                :disabled="acting"
                                                @click="emit('delete', operation)"
                                            >
                                                <span class="su-menu-item__icon su-menu-item__icon--danger">
                                                    <TrashIcon :size="18" stroke-width="1.6" />
                                                </span>
                                                <span class="su-menu-item__title">{{ t('investmentsPage.actions.delete') }}</span>
                                            </button>
                                        </v-sheet>
                                    </v-menu>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-if="page?.hasMore" class="su-more">
                <button type="button" class="su-btn" :disabled="loading" @click="emit('loadMore')">
                    <span v-if="loading" class="su-spin" />
                    {{ t('investmentsPage.operations.loadMore') }}
                </button>
            </div>
        </template>
    </section>
</template>

<style scoped>
.operations__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
}

.operations__count {
    color: var(--gray);
    font-size: 13px;
}

.operations__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin: 0 0 16px;
}

.operations__filter {
    width: 220px;
    max-width: 100%;
}

.operations__table td {
    white-space: nowrap;
}

.operations__date {
    color: var(--gray);
}

.operations__instrument {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 160px;
    white-space: normal;
}

.operations__symbol,
.operations__amount {
    font-weight: 700;
}

.operations__sub {
    color: var(--gray);
    font-size: 13px;
}

.operations__notes {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.operations__actions-col {
    width: 1%;
}

.operations__actions {
    display: flex;
    justify-content: flex-end;
}

.operations__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

.operations-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.operations-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.operations-menu__delete .su-menu-item__title {
    color: var(--danger);
}

@media (max-width: 767px) {
    .operations__filter {
        width: 100%;
    }
}
</style>
