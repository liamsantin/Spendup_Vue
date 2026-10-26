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

/** Présentation du signe : « + » pour un crédit, vrai signe moins (U+2212) pour un débit. */
function signedMoney(value: number) {
    const text = money(value);
    if (value > 0) return `+${text}`;
    if (value < 0) return text.replace('-', '−');
    return text;
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
            createdPaymentMethods: result.createdPaymentMethods,
            detectedRecurrences: result.detectedRecurrences
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
            <div class="su-fig import-commit__hero">
                <p class="su-fig__num import-commit__count">
                    {{ t('importsPage.commit.toCreate', { count: preview.toCreate }, preview.toCreate) }}
                </p>
                <p v-if="periodLabel" class="su-fig__note">{{ periodLabel }}</p>
            </div>

            <dl class="import-commit__totals">
                <div class="su-kv su-kv--strong">
                    <dt>{{ t('importsPage.commit.totalDebit') }}</dt>
                    <dd class="is-debit">{{ signedMoney(-Math.abs(preview.totalDebit)) }}</dd>
                </div>
                <div class="su-kv su-kv--strong">
                    <dt>{{ t('importsPage.commit.totalCredit') }}</dt>
                    <dd class="is-credit">{{ signedMoney(preview.totalCredit) }}</dd>
                </div>
                <template v-if="hasBalance">
                    <div class="su-kv">
                        <dt>{{ t('importsPage.commit.balanceBefore') }}</dt>
                        <dd>{{ money(preview.balanceBefore) }}</dd>
                    </div>
                    <div class="su-kv su-kv--strong">
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
/* Aperçu du commit : chiffre clé sur filet 2 px, totaux en lignes libellé / valeur, contrôle du solde sans boîte colorée. */
.import-commit {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.import-commit__count {
    font-size: 24px;
    white-space: normal;
}

.import-commit__totals {
    margin: 0;
}

.import-commit__totals dd {
    margin: 0;
}

.import-commit__totals dd.is-debit {
    color: rgb(var(--amount-debit));
}

.import-commit__totals dd.is-credit {
    color: rgb(var(--amount-credit));
}

/* contrôle du solde : pictogramme coloré, titre 700, explication grise, filets fins */
.import-commit__check {
    --tint: var(--gray);
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    color: var(--ink);
}

.import-commit__check > svg {
    flex: none;
    color: var(--tint);
}

.import-commit__check.is-match {
    --tint: var(--blue-ink);
}

.import-commit__check.is-mismatch {
    --tint: var(--violet-ink);
}

.import-commit__check-title {
    margin: 0;
    font-weight: 700;
}

.import-commit__check-body {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.import-commit__note {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
}
</style>
