<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, ArrowsSortIcon, DownloadIcon, PencilIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import FilePreview from '@/features/files/components/FilePreview.vue';
import FileUsageMeter from '@/features/files/components/FileUsageMeter.vue';
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
import type { FileDto } from '@/features/files/types';

const SEARCH_DEBOUNCE_MS = 300;
const FILES_PATH = '/app/gestion/files';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFilesStore();
const directoryRef = ref<{
    openPicker: () => void;
    openEdit: (file: FileDto) => void;
    requestDelete: (file: FileDto) => void;
} | null>(null);
const previewRef = ref<{ download: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, FILE_SEARCH_MAX));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const previewId = computed(() => {
    const raw = route.params.publicId;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
});

const previewing = computed(() => !!previewId.value);

const previewFile = computed(() => {
    if (!previewId.value) return null;
    return store.findByPublicId(previewId.value);
});

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

const pageTitle = computed(() => previewFile.value?.nameOriginal || t('filesPage.title'));
const pageSubtitle = computed(() => (previewing.value ? undefined : t('filesPage.subtitle')));

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

function closePreview() {
    void router.replace({ path: FILES_PATH, query: route.query });
}

function onPreviewDownload() {
    previewRef.value?.download();
}

function onPreviewEdit() {
    if (!previewFile.value) return;
    directoryRef.value?.openEdit(previewFile.value);
}

function onPreviewDelete() {
    if (!previewFile.value) return;
    directoryRef.value?.requestDelete(previewFile.value);
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

watch(
    () => queryString('upload'),
    async (upload) => {
        if (upload !== '1' || store.acting) return;
        await nextTick();
        directoryRef.value?.openPicker();
        const next = { ...route.query };
        delete next.upload;
        void router.replace({ path: FILES_PATH, query: next });
    },
    { immediate: true }
);
</script>

<template>
    <div class="files-page" :class="{ 'files-page--reader': previewing }">
        <AppPageShell :title="pageTitle" :subtitle="pageSubtitle">
            <template v-if="previewing" #actions>
                <button type="button" class="su-btn su-btn--ghost" @click="closePreview">
                    <ArrowLeftIcon :size="16" stroke-width="1.6" />
                    {{ t('common.back') }}
                </button>
                <button type="button" class="su-btn" :disabled="!previewId" @click="onPreviewDownload">
                    <DownloadIcon :size="16" stroke-width="1.6" />
                    {{ t('filesPage.actions.download') }}
                </button>
                <button type="button" class="su-btn" :disabled="!previewFile || store.acting" @click="onPreviewEdit">
                    <PencilIcon :size="16" stroke-width="1.6" />
                    {{ t('filesPage.actions.edit') }}
                </button>
                <button type="button" class="su-btn su-btn--danger" :disabled="!previewFile || store.acting" @click="onPreviewDelete">
                    <TrashIcon :size="16" stroke-width="1.6" />
                    {{ t('filesPage.actions.delete') }}
                </button>
            </template>

            <template v-if="!previewing" #toolbar>
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
                        <AppSortChoices
                            v-model="listSort"
                            :items="FILE_SORTS"
                            :label-for="(value) => t(`filesPage.sort.${value}`)"
                        />
                    </AppDropdownFilter>
                    <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onUpload">
                        <UploadIcon :size="16" stroke-width="1.6" />
                        {{ t('filesPage.actions.upload') }}
                    </button>
                </div>
            </template>

            <FilePreview v-if="previewId" ref="previewRef" :public-id="previewId" :name-original="previewFile?.nameOriginal" />
            <div v-show="!previewing">
                <p class="files-page__hint">{{ t('filesPage.uploadHint') }}</p>
                <FileUsageMeter v-if="store.usage" :usage="store.usage" />
                <FilesDirectory ref="directoryRef" />
            </div>
        </AppPageShell>
    </div>
</template>

<style scoped>
.files-page {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
}

.files-page :deep(.su-page) {
    flex: 1 1 auto;
    min-height: 0;
}

.files-page--reader :deep(.su-body) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 8px 10px 10px;
}

.files-page__hint {
    margin: 0 0 12px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}
</style>
