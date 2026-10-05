<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { FileExportIcon, PlusIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import {
    TIER_SEARCH_MAX,
    TIER_SORT_DEFAULT,
    TiersDirectory,
    isTierSort,
    matchesTierSearch,
    parseTierSort,
    useTiersStore
} from '@/features/tiers';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();
const directoryRef = ref<{ openCreate: () => void; exportCsv: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (q) next.q = q.slice(0, TIER_SEARCH_MAX);
    if (sort && isTierSort(sort) && sort !== TIER_SORT_DEFAULT) next.sort = sort;
    void router.replace({ path: route.path, query: next });
}

const listSort = computed({
    get: () => parseTierSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === TIER_SORT_DEFAULT ? undefined : value })
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((tier) => matchesTierSearch(tier, needle)).length;
});

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: TIER_SEARCH_MAX
});
</script>

<template>
    <AppPageShell :title="t('banksPage.title')" :body-scroll="false">
        <AppBoard>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="TIER_SEARCH_MAX"
                    :placeholder="t('banksPage.searchPlaceholder')"
                    :search-label="t('banksPage.actions.search')"
                    :clear-label="t('banksPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="store.initialized && visibleCount" class="su-toolbar__count app-board__count">
                    {{ t('banksPage.count', { count: visibleCount }, visibleCount) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!store.items.length"
                    :aria-label="t('banksPage.actions.export')"
                    @click="directoryRef?.exportCsv()"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('banksPage.actions.export') }}</span>
                </button>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="store.acting"
                    :aria-label="t('banksPage.actions.create')"
                    @click="directoryRef?.openCreate()"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('banksPage.actions.create') }}</span>
                </button>
            </template>

            <TiersDirectory
                ref="directoryRef"
                locked-nature="company"
                :locked-is-bank="true"
                empty-key="banksPage.empty"
                export-name="banques"
                @sort="listSort = $event"
            />
        </AppBoard>
    </AppPageShell>
</template>
