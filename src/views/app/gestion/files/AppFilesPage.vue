<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, ArrowsSortIcon, DownloadIcon, FileExportIcon, PencilIcon, TrashIcon, UploadIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import FilePreview from '@/features/files/components/FilePreview.vue';
import {
    FILE_SEARCH_MAX,
    FILE_SORT_DEFAULT,
    FILE_SORTS,
    FilesDirectory,
    isFileSort,
    parseFileSort,
    useFilesStore
} from '@/features/files';
import type { FileDto } from '@/features/files/types';

const FILES_PATH = '/app/gestion/files';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFilesStore();
const directoryRef = ref<{
    openPicker: () => void;
    openEdit: (file: FileDto) => void;
    requestDelete: (file: FileDto) => void;
    exportCsv: () => void;
    visibleCount: number;
} | null>(null);
const previewRef = ref<{ download: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

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

const visibleCount = computed(() => directoryRef.value?.visibleCount ?? 0);

const sortCount = computed(() => (listSort.value === FILE_SORT_DEFAULT ? 0 : 1));

const pageTitle = computed(() => previewFile.value?.nameOriginal || t('filesPage.title'));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (q) next.q = q.slice(0, FILE_SEARCH_MAX);
    if (sort && isFileSort(sort) && sort !== FILE_SORT_DEFAULT) next.sort = sort;
    const publicId = typeof route.params.publicId === 'string' ? route.params.publicId : '';
    void router.replace({ path: publicId ? `${FILES_PATH}/${publicId}` : FILES_PATH, query: next });
}

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: FILE_SEARCH_MAX
});

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
        <AppPageShell :title="pageTitle" :body-scroll="false">
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

            <FilePreview v-if="previewId" ref="previewRef" :public-id="previewId" :name-original="previewFile?.nameOriginal" />
            <AppBoard v-show="!previewing">
                <template #filters>
                    <AppDropdownFilter
                        :label="t('filesPage.actions.sort')"
                        :icon="ArrowsSortIcon"
                        :min-width="240"
                        close-on-content-click
                        :count="sortCount"
                        :reset-disabled="listSort === FILE_SORT_DEFAULT"
                        @reset="listSort = FILE_SORT_DEFAULT"
                    >
                        <AppSortChoices v-model="listSort" :items="FILE_SORTS" :label-for="(value) => t(`filesPage.sort.${value}`)" />
                    </AppDropdownFilter>
                </template>
                <template #bar>
                    <AppBoardSearch
                        :model-value="search.input.value"
                        :maxlength="FILE_SEARCH_MAX"
                        :placeholder="t('filesPage.searchPlaceholder')"
                        :search-label="t('filesPage.actions.search')"
                        :clear-label="t('filesPage.actions.clearSearch')"
                        @update:model-value="search.onInput"
                        @clear="search.clear"
                    />
                    <span v-if="visibleCount" class="su-toolbar__count app-board__count">
                        {{ t('filesPage.count', { count: visibleCount }, visibleCount) }}
                    </span>
                </template>
                <template #actions>
                    <button
                        type="button"
                        class="su-btn su-btn--ink"
                        :disabled="!visibleCount"
                        :aria-label="t('filesPage.actions.export')"
                        @click="directoryRef?.exportCsv()"
                    >
                        <FileExportIcon :size="16" stroke-width="1.6" />
                        <span class="app-board__label">{{ t('filesPage.actions.export') }}</span>
                    </button>
                    <button
                        type="button"
                        class="su-btn su-btn--ink app-board__primary"
                        :disabled="store.acting"
                        :aria-label="t('filesPage.actions.upload')"
                        @click="onUpload"
                    >
                        <UploadIcon :size="16" stroke-width="1.6" />
                        <span class="app-board__label">{{ t('filesPage.actions.create') }}</span>
                    </button>
                </template>

                <FilesDirectory
                    ref="directoryRef"
                    :search="queryString('q') || null"
                    :sort="listSort"
                    @sort="listSort = $event"
                />
            </AppBoard>
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
</style>
