<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowsSortIcon, SearchIcon, UploadIcon, XIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import {
    FILE_SEARCH_MAX,
    FILE_SORT_DEFAULT,
    FILE_SORTS,
    FilesDirectory,
    isFileSort,
    matchesFileSearch,
    parseFileSort,
    useFilesStore
} from '@/features/files';

const SEARCH_DEBOUNCE_MS = 300;
const FILES_PATH = '/app/gestion/files';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFilesStore();
const directoryRef = ref<{ openPicker: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, FILE_SEARCH_MAX));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const listSort = computed({
    get: () => parseFileSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === FILE_SORT_DEFAULT ? undefined : value })
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((file) => matchesFileSearch(file, needle)).length;
});

const sortCount = computed(() => (listSort.value === FILE_SORT_DEFAULT ? 0 : 1));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (q) next.q = q.slice(0, FILE_SEARCH_MAX);
    if (sort && isFileSort(sort) && sort !== FILE_SORT_DEFAULT) next.sort = sort;
    const publicId = typeof route.params.publicId === 'string' ? route.params.publicId : '';
    void router.replace({ path: publicId ? `${FILES_PATH}/${publicId}` : FILES_PATH, query: next });
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, FILE_SEARCH_MAX);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        patchQuery({ q: searchInput.value.trim() || undefined });
    }, SEARCH_DEBOUNCE_MS);
}

function clearSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = null;
    searchInput.value = '';
    patchQuery({ q: undefined });
}

function onUpload() {
    if (store.acting) return;
    directoryRef.value?.openPicker();
}

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, FILE_SEARCH_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) {
            searchInput.value = next;
        }
    }
);
</script>

<template>
    <AppPageShell :title="t('filesPage.title')" :subtitle="t('filesPage.subtitle')">
        <template #toolbar>
            <label class="su-search su-search--discover">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="FILE_SEARCH_MAX"
                    :placeholder="t('filesPage.searchPlaceholder')"
                    :aria-label="t('filesPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('filesPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count">
                {{ t('filesPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('filesPage.actions.sort')"
                    :icon="ArrowsSortIcon"
                    :min-width="240"
                    close-on-content-click
                    :count="sortCount"
                    :reset-disabled="listSort === FILE_SORT_DEFAULT"
                    @reset="listSort = FILE_SORT_DEFAULT"
                >
                    <v-list class="py-0">
                        <v-list-item
                            v-for="value in FILE_SORTS"
                            :key="value"
                            :active="listSort === value"
                            color="primary"
                            @click="listSort = value"
                        >
                            <v-list-item-title>{{ t(`filesPage.sort.${value}`) }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onUpload">
                    <UploadIcon :size="16" stroke-width="1.6" />
                    {{ t('filesPage.actions.upload') }}
                </button>
            </div>
        </template>

        <p class="files-page__hint">{{ t('filesPage.uploadHint') }}</p>
        <FilesDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
.files-page__hint {
    margin: 0 0 12px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}
</style>
