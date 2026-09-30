<script setup lang="ts">
/**
 * Aperçu avant commit (`GET /preview`) puis `POST /commit`. Tout ou rien.
 * Lignes non tranchées : confirmation explicite, puis `ignoreUnresolved: true`.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlertTriangleIcon, CircleCheckIcon, InfoCircleIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatOperationDate } from '@/features/transactions/format';
import { importsApi } from '@/features/imports/api';
import { countEntitiesToCreate, formatImportAmount, type ImportEntitiesToCreate } from '@/features/imports/format';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import { IMPORT_LINES_PAGE_SIZE_MAX, type Import, type ImportCommitSummary, type ImportLine } from '@/features/imports/types';

const props = defineProps<{
    modelValue: boolean;
    item: Import;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    committed: [summary: ImportCommitSummary];
}>();

const { t, locale } = useI18n();
const store = useImportsStore();

const localError = ref<string | null>(null);
const toCreateEntities = ref<ImportEntitiesToCreate | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const preview = computed(() => store.preview);
const currency = computed(() => props.item.accountCurrency);

function money(value: number | null | undefined) {
    return formatImportAmount(value, currency.value, locale.value);
}

const periodLabel = computed(() => {
    const from = preview.value?.periodFrom;
    const to = preview.value?.periodTo;
    if (!from || !to) return null;
    return t('importsPage.list.period', { from: formatOperationDate(from, locale.value), to: formatOperationDate(to, locale.value) });
});

/** « 12 tiers et 2 moyens de paiement seront créés. » */
const entitiesText = computed(() => {
    const counts = toCreateEntities.value;
    if (!counts || (!counts.tiers && !counts.paymentMethods)) return null;
    const parts: string[] = [];
    if (counts.tiers) parts.push(t('importsPage.commit.entities.tiers', { count: counts.tiers }, counts.tiers));
    if (counts.paymentMethods) {
        parts.push(t('importsPage.commit.entities.paymentMethods', { count: counts.paymentMethods }, counts.paymentMethods));
    }
    const total = counts.tiers + counts.paymentMethods;
    return t('importsPage.commit.entities.willCreate', { list: parts.join(t('importsPage.commit.entities.and')) }, total);
});

/** Toutes les lignes `validee` (l’aperçu API ne compte pas les entités à créer). */
async function loadEntitiesToCreate(publicId: string) {
    toCreateEntities.value = null;
    try {
        const lines: ImportLine[] = [];
        for (let page = 1; ; page++) {
            const result = await importsApi.listLines(publicId, { status: 'validee', page, pageSize: IMPORT_LINES_PAGE_SIZE_MAX });
            lines.push(...result.items);
            if (!result.items.length || lines.length >= result.totalCount) break;
        }
        if (props.item.publicId === publicId) toCreateEntities.value = countEntitiesToCreate(lines);
    } catch {
        // Indicatif : le commit reste possible sans ce décompte.
    }
}

const unresolved = computed(() => preview.value?.unresolved ?? 0);
const canCommit = computed(() => !!preview.value && preview.value.toCreate > 0 && !store.acting && !store.previewLoading);
const hasBalance = computed(() => preview.value?.balanceBefore != null && preview.value?.balanceAfter != null);

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        localError.value = null;
        store.loadPreview(props.item.publicId).catch((e: unknown) => {
            localError.value = getErrorMessage(e);
        });
        void loadEntitiesToCreate(props.item.publicId);
    }
);

async function onCommit() {
    if (!canCommit.value) return;
    localError.value = null;
    try {
        const result = await store.commitImport(props.item.publicId, { ignoreUnresolved: unresolved.value > 0 });
        emit('committed', {
            createdTransactions: result.createdTransactions,
            createdTiers: result.createdTiers,
            createdPaymentMethods: result.createdPaymentMethods
        });
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        // Lignes changées entre-temps (autre onglet, ligne supprimée) : relire l’aperçu.
        void store.loadPreview(props.item.publicId).catch(() => undefined);
        void loadEntitiesToCreate(props.item.publicId);
    }
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('importsPage.commit.title')" :subtitle="item.fileName" :max-width="560" :height="700">
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div v-if="store.previewLoading && !preview" class="su-loading">
            <span class="su-spin" />
        </div>

        <div v-else-if="preview" class="import-commit">
            <div class="import-commit__hero">
                <p class="import-commit__count">{{ t('importsPage.commit.toCreate', { count: preview.toCreate }, preview.toCreate) }}</p>
                <p v-if="periodLabel" class="import-commit__period">{{ periodLabel }}</p>
            </div>

            <dl class="import-commit__totals">
                <div>
                    <dt>{{ t('importsPage.commit.totalDebit') }}</dt>
                    <dd class="is-debit">{{ money(-Math.abs(preview.totalDebit)) }}</dd>
                </div>
                <div>
                    <dt>{{ t('importsPage.commit.totalCredit') }}</dt>
                    <dd class="is-credit">{{ money(preview.totalCredit) }}</dd>
                </div>
                <template v-if="hasBalance">
                    <div>
                        <dt>{{ t('importsPage.commit.balanceBefore') }}</dt>
                        <dd>{{ money(preview.balanceBefore) }}</dd>
                    </div>
                    <div>
                        <dt>{{ t('importsPage.commit.balanceAfter') }}</dt>
                        <dd>{{ money(preview.balanceAfter) }}</dd>
                    </div>
                </template>
            </dl>

            <div class="import-commit__check" :class="`is-${preview.balanceCheck}`">
                <CircleCheckIcon v-if="preview.balanceCheck === 'match'" :size="20" stroke-width="1.7" />
                <AlertTriangleIcon v-else-if="preview.balanceCheck === 'mismatch'" :size="20" stroke-width="1.7" />
                <InfoCircleIcon v-else :size="20" stroke-width="1.7" />
                <div>
                    <p class="import-commit__check-title">{{ t(`importsPage.commit.balanceCheck.${preview.balanceCheck}`) }}</p>
                    <p v-if="preview.balanceCheck === 'mismatch'" class="import-commit__check-body">
                        {{
                            t('importsPage.commit.balanceMismatch', {
                                bank: money(preview.bankClosingBalance),
                                difference: money(preview.balanceDifference)
                            })
                        }}
                    </p>
                    <p v-else-if="preview.balanceCheck === 'unavailable'" class="import-commit__check-body">
                        {{ t('importsPage.commit.balanceUnavailable') }}
                    </p>
                </div>
            </div>

            <AppAlert v-if="entitiesText" type="info">{{ entitiesText }}</AppAlert>
            <AppAlert v-if="unresolved > 0" type="warning">
                {{ t('importsPage.commit.unresolved', { count: unresolved }, unresolved) }}
            </AppAlert>
            <AppAlert v-if="preview.toCreate === 0" type="info">{{ t('importsPage.commit.nothingToCreate') }}</AppAlert>
            <p class="import-commit__note">{{ t('importsPage.commit.note') }}</p>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canCommit" @click="onCommit">
                <span v-if="store.acting" class="su-spin" />
                {{
                    unresolved > 0
                        ? t('importsPage.commit.confirmIgnoring', { count: preview?.toCreate ?? 0 }, preview?.toCreate ?? 0)
                        : t('importsPage.commit.confirm', { count: preview?.toCreate ?? 0 }, preview?.toCreate ?? 0)
                }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.import-commit {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.import-commit__hero {
    text-align: center;
}

.import-commit__count {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 680;
    letter-spacing: -0.02em;
}

.import-commit__period {
    margin: 4px 0 0;
    font-size: 0.84rem;
    color: var(--ink-muted);
}

.import-commit__totals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
}

.import-commit__totals > div {
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--hair, rgba(16, 16, 20, 0.04));
}

.import-commit__totals dt {
    font-size: 0.76rem;
    color: var(--ink-muted);
}

.import-commit__totals dd {
    margin: 2px 0 0;
    font-size: 1rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
}

.import-commit__totals dd.is-debit {
    color: rgb(var(--amount-debit));
}

.import-commit__totals dd.is-credit {
    color: rgb(var(--amount-credit));
}

.import-commit__check {
    --tint: var(--ink-muted);
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 14px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--tint) 10%, transparent);
    color: var(--tint);
}

.import-commit__check.is-match {
    --tint: rgb(var(--v-theme-success));
}

.import-commit__check.is-mismatch {
    --tint: rgb(var(--v-theme-warning));
}

.import-commit__check-title {
    margin: 0;
    font-weight: 620;
}

.import-commit__check-body {
    margin: 2px 0 0;
    font-size: 0.82rem;
    color: var(--ink-soft);
}

.import-commit__note {
    margin: 0;
    font-size: 0.78rem;
    color: var(--ink-muted);
}
</style>
