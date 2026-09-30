<script setup lang="ts">
/**
 * Revue des lignes (`aValider`) : recherche, tri, corrections, actions groupées, puis commit.
 * Filtres dans la query (`status`, `q`, `sort`) ; les onglets de statut sont dans le hero de la page.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
    ArrowsSortIcon,
    CalendarIcon,
    ChecksIcon,
    ChevronDownIcon,
    CoinIcon,
    ColumnsIcon,
    ListNumbersIcon,
    PlayerPlayIcon
} from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import type { AppSortGroup } from '@/components/shared/dropdown-filter/sort-choices';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { TIER_PAGE_SIZE_MAX } from '@/features/tiers/types';
import { formatOperationDate } from '@/features/transactions/format';
import ImportLineListItem from '@/features/imports/components/list/ImportLineListItem.vue';
import ImportLineTable from '@/features/imports/components/list/ImportLineTable.vue';
import ImportCommitModal from '@/features/imports/components/modals/ImportCommitModal.vue';
import ImportLineEditModal from '@/features/imports/components/modals/ImportLineEditModal.vue';
import { isImportLineStatus, parseImportLineSort } from '@/features/imports/format';
import { importDetailPath } from '@/features/imports/paths';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import {
    IMPORT_LINE_SEARCH_MAX,
    IMPORT_LINE_SORT_DEFAULT,
    type BulkUpdateImportLinesPayload,
    type Import,
    type ImportCommitSummary,
    type ImportLine,
    type ImportLineSort,
    type ImportLineStatus
} from '@/features/imports/types';

type BulkShortcut = { key: string; label: string; count: number; payload: BulkUpdateImportLinesPayload; confirm?: string };

const props = defineProps<{
    item: Import;
}>();

const emit = defineEmits<{
    remap: [];
    committed: [summary: ImportCommitSummary];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useImportsStore();
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();

const editTarget = ref<ImportLine | null>(null);
const commitOpen = ref(false);
const bulkMenuOpen = ref(false);
const pendingBulk = ref<BulkShortcut | null>(null);
const notice = ref<string | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const bulkConfirmOpen = computed({
    get: () => !!pendingBulk.value,
    set: (value: boolean) => {
        if (!value) pendingBulk.value = null;
    }
});

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const filterStatus = computed<ImportLineStatus | null>(() => {
    const raw = queryString('status');
    return isImportLineStatus(raw) ? raw : null;
});
const filterSearch = computed(() => queryString('q').trim().slice(0, IMPORT_LINE_SEARCH_MAX));
const listSort = computed(() => parseImportLineSort(queryString('sort')));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const status = 'status' in patch ? patch.status : queryString('status') || undefined;
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (status && isImportLineStatus(status)) next.status = status;
    if (q) next.q = q.slice(0, IMPORT_LINE_SEARCH_MAX);
    if (sort && sort !== IMPORT_LINE_SORT_DEFAULT) next.sort = sort;
    void router.replace({ path: importDetailPath(props.item.publicId), query: next });
}

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: IMPORT_LINE_SEARCH_MAX
});

const sortModel = computed({
    get: () => listSort.value,
    set: (value: ImportLineSort) => patchQuery({ sort: value })
});

const sortGroups = computed<AppSortGroup<ImportLineSort>[]>(() => [
    {
        id: 'lineNumber',
        label: t('importsPage.lines.sort.lineNumber'),
        icon: ListNumbersIcon,
        options: [
            { value: 'lineNumber', label: t('importsPage.lines.sort.firstFirst') },
            { value: '-lineNumber', label: t('importsPage.lines.sort.lastFirst') }
        ]
    },
    {
        id: 'date',
        label: t('importsPage.lines.sort.date'),
        icon: CalendarIcon,
        options: [
            { value: '-date', label: t('importsPage.lines.sort.recent') },
            { value: 'date', label: t('importsPage.lines.sort.oldest') }
        ]
    },
    {
        id: 'amount',
        label: t('importsPage.lines.sort.amount'),
        icon: CoinIcon,
        options: [
            { value: 'amount', label: t('importsPage.lines.sort.lowest') },
            { value: '-amount', label: t('importsPage.lines.sort.highest') }
        ]
    },
    {
        id: 'status',
        label: t('importsPage.lines.sort.status'),
        icon: ChecksIcon,
        options: [
            { value: 'status', label: t('importsPage.lines.sort.asc') },
            { value: '-status', label: t('importsPage.lines.sort.desc') }
        ]
    }
]);

/** Les compteurs viennent de `import.counts` (mis à jour après chaque correction). */
const bulkShortcuts = computed<BulkShortcut[]>(() => {
    const { toReview, errors } = props.item.counts;
    return [
        {
            key: 'validateToReview',
            label: t('importsPage.bulk.validateToReview', { count: toReview }, toReview),
            count: toReview,
            payload: { action: 'validate', status: 'aValider' },
            confirm: t('importsPage.bulk.validateToReviewConfirm', { count: toReview }, toReview)
        },
        {
            key: 'ignoreToReview',
            label: t('importsPage.bulk.ignoreToReview', { count: toReview }, toReview),
            count: toReview,
            payload: { action: 'ignore', status: 'aValider' }
        },
        {
            key: 'ignoreErrors',
            label: t('importsPage.bulk.ignoreErrors', { count: errors }, errors),
            count: errors,
            payload: { action: 'ignore', status: 'erreur' }
        }
    ];
});

const warnings = computed(() => props.item.analysis.warnings);

function warningText(code: string, fallback: string, date?: string | null) {
    const formatted = date ? formatOperationDate(date, locale.value) : '';
    if (code === 'FILE_ALREADY_IMPORTED') return t('importsPage.warnings.alreadyImported', { date: formatted });
    if (code === 'PERIOD_OVERLAP') return t('importsPage.warnings.periodOverlap', { date: formatted });
    return fallback;
}

const emptyCopy = computed(() => {
    if (filterSearch.value) return t('importsPage.lines.empty.search');
    if (filterStatus.value) return t(`importsPage.lines.empty.${filterStatus.value}`);
    return t('importsPage.lines.empty.all');
});

watch(
    () => [filterStatus.value, filterSearch.value, listSort.value] as const,
    ([status, q, sort]) => {
        const current = store.linesFilter;
        if (current.status === status && current.q === q && current.sort === sort) return;
        localError.value = null;
        store.loadLines({ status, q, sort }).catch((e: unknown) => {
            localError.value = getErrorMessage(e);
        });
    },
    { immediate: true }
);

void categoriesStore.loadList().catch(() => undefined);
void tiersStore.loadList({ pageSize: TIER_PAGE_SIZE_MAX }).catch(() => undefined);

async function patchLine(line: ImportLine, status: 'validee' | 'ignoree') {
    localError.value = null;
    try {
        await store.updateLine(line.publicId, { status });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function runBulk(shortcut: BulkShortcut) {
    localError.value = null;
    notice.value = null;
    try {
        const result = await store.bulkUpdateLines(shortcut.payload);
        notice.value = t('importsPage.lines.bulkResult', { updated: result.updated, skipped: result.skipped }, result.updated);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onBulk(shortcut: BulkShortcut) {
    bulkMenuOpen.value = false;
    if (!shortcut.count) return;
    if (shortcut.confirm) {
        pendingBulk.value = shortcut;
        return;
    }
    void runBulk(shortcut);
}

function confirmBulk() {
    const shortcut = pendingBulk.value;
    pendingBulk.value = null;
    if (shortcut) void runBulk(shortcut);
}
</script>

<template>
    <div class="import-review">
        <AppAlert
            v-for="warning in warnings"
            :key="`${warning.code}-${warning.importPublicId ?? ''}`"
            type="warning"
            class="import-review__banner"
        >
            {{ warningText(warning.code, warning.message, warning.date) }}
            <RouterLink
                v-if="warning.code === 'FILE_ALREADY_IMPORTED' && warning.importPublicId"
                :to="importDetailPath(warning.importPublicId)"
                class="import-review__link"
            >
                {{ t('importsPage.warnings.openPrevious') }}
            </RouterLink>
        </AppAlert>
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="import-review__banner"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>
        <AppAlert v-if="notice" type="success" class="import-review__banner" closable :dismiss-ms="6000" @dismiss="notice = null">
            {{ notice }}
        </AppAlert>

        <AppBoard>
            <template #filters>
                <AppDropdownFilter
                    :label="t('importsPage.lines.sort.label')"
                    :icon="ArrowsSortIcon"
                    :min-width="340"
                    :reset-disabled="listSort === IMPORT_LINE_SORT_DEFAULT"
                    @reset="patchQuery({ sort: undefined })"
                >
                    <div class="pa-2">
                        <AppSortChoices v-model="sortModel" :groups="sortGroups" :label="t('importsPage.lines.sort.label')" />
                    </div>
                </AppDropdownFilter>
                <v-menu v-model="bulkMenuOpen" location="bottom start" :offset="8">
                    <template #activator="{ props: menuProps }">
                        <button type="button" class="su-btn" v-bind="menuProps" :disabled="store.acting">
                            <ChecksIcon :size="16" stroke-width="1.6" />
                            <span class="app-board__label">{{ t('importsPage.bulk.label') }}</span>
                            <ChevronDownIcon :size="14" stroke-width="1.8" />
                        </button>
                    </template>
                    <v-sheet elevation="0" class="su-menu import-review__bulk-menu">
                        <button
                            v-for="shortcut in bulkShortcuts"
                            :key="shortcut.key"
                            type="button"
                            class="import-review__bulk-item"
                            :disabled="!shortcut.count || store.acting"
                            @click="onBulk(shortcut)"
                        >
                            {{ shortcut.label }}
                        </button>
                        <p class="import-review__bulk-hint">{{ t('importsPage.bulk.sameLabelHint') }}</p>
                    </v-sheet>
                </v-menu>
            </template>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="IMPORT_LINE_SEARCH_MAX"
                    :placeholder="t('importsPage.lines.searchPlaceholder')"
                    :search-label="t('importsPage.lines.search')"
                    :clear-label="t('importsPage.lines.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="store.linesTotal" class="su-toolbar__count app-board__count">
                    {{ t('importsPage.lines.count', { count: store.linesTotal }, store.linesTotal) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting"
                    :aria-label="t('importsPage.actions.remap')"
                    @click="emit('remap')"
                >
                    <ColumnsIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('importsPage.actions.remap') }}</span>
                </button>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="store.acting || !item.counts.validated"
                    :aria-label="t('importsPage.actions.commit')"
                    @click="commitOpen = true"
                >
                    <PlayerPlayIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('importsPage.actions.commit') }}</span>
                </button>
            </template>

            <div class="import-review__scroll">
                <div v-if="store.linesLoading && !store.lines.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.lines.length" class="su-empty">
                    <p>{{ emptyCopy }}</p>
                </div>
                <div v-else class="import-review__directory">
                    <div class="import-review__list">
                        <ImportLineListItem
                            v-for="line in store.lines"
                            :key="line.publicId"
                            :line="line"
                            :currency="item.accountCurrency"
                            editable
                            :acting="store.acting"
                            @validate="patchLine($event, 'validee')"
                            @ignore="patchLine($event, 'ignoree')"
                            @restore="patchLine($event, 'validee')"
                            @edit="editTarget = $event"
                        />
                    </div>
                    <ImportLineTable
                        class="import-review__table"
                        :lines="store.lines"
                        :sort="listSort"
                        :currency="item.accountCurrency"
                        editable
                        :acting="store.acting"
                        @sort="patchQuery({ sort: $event })"
                        @validate="patchLine($event, 'validee')"
                        @ignore="patchLine($event, 'ignoree')"
                        @restore="patchLine($event, 'validee')"
                        @edit="editTarget = $event"
                    />
                </div>
                <div v-if="store.linesHasMore" class="su-more">
                    <button type="button" class="su-btn su-btn--ghost" :disabled="store.linesLoadingMore" @click="store.loadMoreLines()">
                        {{ t('importsPage.loadMore') }}
                    </button>
                </div>
            </div>
        </AppBoard>

        <ImportLineEditModal
            v-model="editOpen"
            :line="editTarget"
            :account-public-id="item.accountPublicId"
            :currency="item.accountCurrency"
            @notice="notice = $event"
        />
        <ImportCommitModal v-model="commitOpen" :item="item" @committed="emit('committed', $event)" />
        <AppConfirmationModal
            v-model="bulkConfirmOpen"
            :title="t('importsPage.bulk.confirmTitle')"
            :message="pendingBulk?.confirm"
            :confirm-label="t('common.continue')"
            :loading="store.acting"
            @confirm="confirmBulk"
        />
    </div>
</template>

<style scoped>
.import-review {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.import-review__banner {
    flex: none;
    margin-bottom: 10px;
}

.import-review__link {
    margin-left: 6px;
    color: inherit;
    font-weight: 620;
}

.import-review__scroll {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.import-review__directory {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px 16px 10px;
}

.import-review__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.import-review__table {
    display: none;
}

@media (min-width: 768px) {
    .import-review__list {
        display: none;
    }

    .import-review__table {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
    }
}

@media (max-width: 767px) {
    .import-review__scroll {
        display: block;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    .import-review__directory {
        display: block;
        padding: 0 4px 4px;
    }
}
</style>

<style>
.import-review__bulk-menu.su-menu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: min(320px, calc(100vw - 24px));
    padding: 8px !important;
}

.import-review__bulk-item {
    appearance: none;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.88rem;
    text-align: left;
    cursor: pointer;
}

.import-review__bulk-item:hover:not(:disabled) {
    background: var(--surface-hover);
}

.import-review__bulk-item:disabled {
    cursor: default;
    opacity: 0.45;
}

.import-review__bulk-hint {
    margin: 4px 12px 2px;
    font-size: 0.74rem;
    color: var(--ink-muted);
}
</style>
