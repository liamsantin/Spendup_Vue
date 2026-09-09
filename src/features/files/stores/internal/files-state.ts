import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { sortFiles } from '@/features/files/format';
import { FILE_PAGE_SIZE_DEFAULT, type FileDto } from '@/features/files/types';

export const FILES_LIST_MAX_AGE_MS = 30_000;

export const FILES_LIST_CACHE_KEY = 'list:all';

export type FilesCacheEntry = {
    items: FileDto[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export function createFilesState() {
    const items = ref<FileDto[]>([]);
    const itemsByListKey = new Map<string, FilesCacheEntry>();
    const knownById = new Map<string, FileDto>();
    const activeListKey = ref(FILES_LIST_CACHE_KEY);
    const page = ref(1);
    const pageSize = ref(FILE_PAGE_SIZE_DEFAULT);
    const totalCount = ref(0);

    const loading = ref(false);
    const loadingMore = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: FILES_LIST_MAX_AGE_MS });

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => items.value.length > 0 && items.value.length < totalCount.value);

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    function remember(file: FileDto) {
        knownById.set(file.publicId, file);
    }

    function setList(key: string, nextItems: FileDto[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const sorted = sortFiles(nextItems);
        for (const file of sorted) remember(file);
        const prev = itemsByListKey.get(key);
        const entry: FilesCacheEntry = {
            items: sorted,
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? FILE_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? sorted.length
        };
        itemsByListKey.set(key, entry);
        if (activeListKey.value === key) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
        }
    }

    function activateList(key: string) {
        activeListKey.value = key;
        const entry = itemsByListKey.get(key);
        if (entry) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
            return;
        }
        items.value = [];
        page.value = 1;
        pageSize.value = FILE_PAGE_SIZE_DEFAULT;
        totalCount.value = 0;
    }

    function upsertItem(file: FileDto) {
        remember(file);
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const existed = prev.items.some((item) => item.publicId === file.publicId);
            const without = prev.items.filter((item) => item.publicId !== file.publicId);
            const nextTotal = existed ? prev.totalCount : prev.totalCount + 1;
            setList(key, [...without, file], { totalCount: nextTotal });
        }
        if (!itemsByListKey.size) {
            setList(FILES_LIST_CACHE_KEY, [file], { page: 1, pageSize: FILE_PAGE_SIZE_DEFAULT, totalCount: 1 });
        }
    }

    function removeItemLocal(publicId: string) {
        knownById.delete(publicId);
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const nextItems = prev.items.filter((item) => item.publicId !== publicId);
            if (nextItems.length === prev.items.length) continue;
            setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - 1) });
        }
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) {
            cache.invalidate(key);
        }
    }

    function allKnownItems(): FileDto[] {
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): FileDto | null {
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? null;
    }

    return {
        items,
        itemsByListKey,
        knownById,
        activeListKey,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        hasMore,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        allKnownItems,
        findByPublicId
    };
}

export type FilesState = ReturnType<typeof createFilesState>;
