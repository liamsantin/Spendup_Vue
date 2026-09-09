<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import {
    isFileLinkedToTransactionsMessage,
    isQuotaExceededMessage,
    matchesFileSearch,
    parseFileSort,
    sortFiles,
    wouldExceedQuota
} from '@/features/files/format';
import { downloadFileBlob } from '@/features/files/composables/useFileContentUrl';
import { useFilesStore } from '@/features/files/stores/files-store';
import { FILE_PAGE_SIZE_MAX, FILE_PDF_MIME, FILE_SEARCH_MAX, type FileDto } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';
import FileListItem from '@/features/files/components/list/FileListItem.vue';
import FileEditModal from '@/features/files/components/modals/FileEditModal.vue';

const FILES_PATH = '/app/gestion/files';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFilesStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const uploadProgress = ref(0);
const uploadingName = ref<string | null>(null);
const editTarget = ref<FileDto | null>(null);
const deleteTarget = ref<FileDto | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, FILE_SEARCH_MAX) ?? null);
const listSort = computed(() => parseFileSort(queryString('sort')));
const previewId = computed(() => {
    const raw = route.params.publicId;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
});

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    const items = needle ? store.items.filter((file) => matchesFileSearch(file, needle)) : store.items;
    return sortFiles(items, listSort.value);
});

const emptyCopy = computed(() => (filterSearch.value ? t('filesPage.empty.filtered') : t('filesPage.empty.list')));
const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);
const uploading = computed(() => !!uploadingName.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            pageSize: filterSearch.value ? FILE_PAGE_SIZE_MAX : undefined,
            force
        });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void store.loadUsage();
    void loadDirectory()
        .then(async () => {
            if (previewId.value && !store.findByPublicId(previewId.value)) {
                const file = await store.fetchFile(previewId.value);
                if (!file) {
                    localError.value = t('filesPage.errors.notFound');
                    void router.replace({ path: FILES_PATH, query: route.query });
                }
            }
        })
        .catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(filterSearch, async (search, previousSearch) => {
    if (search && store.hasMore) {
        await loadDirectory(true).catch(() => undefined);
    }
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) {
        searchRevealKey.value += 1;
    }
});

watch(previewId, async (id) => {
    if (!id) return;
    if (store.findByPublicId(id)) return;
    try {
        const file = await store.fetchFile(id);
        if (!file) {
            localError.value = t('filesPage.errors.notFound');
            void router.replace({ path: FILES_PATH, query: route.query });
        }
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
});

defineExpose({
    openPicker: () => fileInputRef.value?.click(),
    onFiles: (files: FileList | File[]) => void uploadFiles(files),
    openEdit: (file: FileDto) => {
        editTarget.value = file;
    },
    requestDelete
});

function openPreview(file: FileDto) {
    void router.push({ path: `${FILES_PATH}/${file.publicId}`, query: route.query });
}

async function onDownload(file: FileDto) {
    localError.value = null;
    try {
        await downloadFileBlob(file.publicId, file.nameOriginal);
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('filesPage.errors.notFound') : getErrorMessage(e);
    }
}

function requestDelete(file: FileDto) {
    deleteTarget.value = file;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    const id = deleteTarget.value.publicId;
    try {
        await store.deleteFile(id);
        deleteTarget.value = null;
        if (previewId.value === id) {
            void router.replace({ path: FILES_PATH, query: route.query });
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('filesPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        if (isFileLinkedToTransactionsMessage(err.message)) {
            localError.value = t('filesPage.errors.linkedToTransactions');
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function uploadFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length || uploading.value) return;
    localError.value = null;
    store.clearError();

    for (const file of files) {
        const check = await validatePdfFile(file);
        if (!check.ok) {
            localError.value = t(`filesPage.errors.${check.code}`);
            return;
        }
        const usage = store.usage;
        if (usage && wouldExceedQuota(usage, file.size)) {
            localError.value = t('filesPage.errors.quotaExceeded');
            return;
        }
        uploadingName.value = file.name;
        uploadProgress.value = 0;
        try {
            await store.uploadFile(file, (percent) => {
                uploadProgress.value = percent;
            });
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            localError.value = isQuotaExceededMessage(err.message) ? t('filesPage.errors.quotaExceeded') : getErrorMessage(e);
            break;
        } finally {
            uploadingName.value = null;
            uploadProgress.value = 0;
        }
    }
}

function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    // FileList est live : vider l’input avant la copie annule la sélection.
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length) void uploadFiles(files);
}

function isFileDrag(event: DragEvent) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function onDragEnter(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragging.value = true;
}

function onDragOver(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    dragging.value = true;
}

function onDragLeave(event: DragEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as Node).contains(next)) return;
    dragging.value = false;
}

function onDrop(event: DragEvent) {
    event.preventDefault();
    dragging.value = false;
    const files = event.dataTransfer?.files;
    if (files?.length) void uploadFiles(files);
}
</script>

<template>
    <div class="files-directory" @dragenter="onDragEnter" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
        <input ref="fileInputRef" class="files-directory__input" type="file" :accept="`${FILE_PDF_MIME},.pdf`" @change="onFileSelected" />

        <div v-if="dragging" class="files-directory__drop">
            <p class="files-directory__drop-title">{{ t('filesPage.drop.title') }}</p>
            <p>{{ t('filesPage.drop.body') }}</p>
        </div>

        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="uploading" class="files-directory__progress" role="status">
            <p>{{ t('filesPage.upload.progress', { name: uploadingName, percent: uploadProgress }) }}</p>
            <div class="files-directory__bar">
                <span class="files-directory__bar-fill" :style="{ width: `${uploadProgress}%` }" />
            </div>
        </div>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div
            v-else-if="!visibleItems.length"
            :key="`empty-${searchRevealKey}`"
            class="su-empty"
            :class="{ 'is-search-reveal': searchReveals }"
        >
            <p>{{ emptyCopy }}</p>
        </div>
        <div v-else class="su-stack">
            <section class="su-surface files-directory__group">
                <div :key="searchRevealKey" class="files-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                    <FileListItem
                        v-for="(file, index) in visibleItems"
                        :key="file.publicId"
                        :file="file"
                        :acting="store.acting || uploading"
                        :style="{ '--i': index }"
                        @preview="openPreview"
                        @download="onDownload"
                        @edit="editTarget = $event"
                        @delete="requestDelete"
                    />
                </div>
            </section>
        </div>

        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('filesPage.loadMore') }}
            </button>
        </div>

        <FileEditModal v-model="editOpen" :file="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('filesPage.deleteModal.title')"
            :message="t('filesPage.deleteModal.body')"
            :confirm-label="t('filesPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.files-directory {
    position: relative;
}

.files-directory__input {
    display: none;
}

.files-directory__drop {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: grid;
    place-content: center;
    gap: 4px;
    min-height: 220px;
    border-radius: 16px;
    border: 1.5px dashed rgb(var(--v-theme-primary));
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, var(--surface-raised));
    color: var(--ink-muted);
    text-align: center;
    pointer-events: none;
}

.files-directory__drop-title {
    margin: 0;
    font-weight: 650;
    color: inherit;
}

.files-directory__progress {
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface-raised);
}

.files-directory__progress p {
    margin: 0 0 8px;
    font-size: 0.85rem;
}

.files-directory__bar {
    height: 6px;
    border-radius: 999px;
    background: var(--hair);
    overflow: hidden;
}

.files-directory__bar-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--v-theme-primary));
    transition: width 0.2s var(--ease);
}

.files-directory__group {
    overflow: visible;
}

.files-directory__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: visible;
    padding: 8px;
}
</style>
