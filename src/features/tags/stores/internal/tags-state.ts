import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { matchesTagSearch, normalizeTag, sortTags } from '@/features/tags/format';
import type { Tag } from '@/features/tags/types';

export const TAGS_LIST_MAX_AGE_MS = 30_000;
export const KEY_LIST = 'list';

export type TagsCacheEntry = {
    items: Tag[];
    totalCount: number;
};

export function createTagsState() {
    const items = ref<Tag[]>([]);
    const itemsByListKey = new Map<string, TagsCacheEntry>();
    const knownById = new Map<string, Tag>();
    const activeListKey = ref(KEY_LIST);
    const totalCount = ref(0);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: TAGS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);

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

    function remember(tag: Tag) {
        const next = normalizeTag(tag);
        knownById.set(next.publicId, next);
        return next;
    }

    function setList(key: string, nextItems: Tag[], meta?: { totalCount?: number }) {
        const sorted = sortTags(nextItems.map(remember));
        const prev = itemsByListKey.get(key);
        const entry: TagsCacheEntry = {
            items: sorted,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? sorted.length
        };
        itemsByListKey.set(key, entry);
        if (activeListKey.value === key) {
            items.value = entry.items;
            totalCount.value = entry.totalCount;
        }
    }

    function activateList(key: string) {
        activeListKey.value = key;
        const entry = itemsByListKey.get(key);
        if (entry) {
            items.value = entry.items;
            totalCount.value = entry.totalCount;
            return;
        }
        items.value = [];
        totalCount.value = 0;
    }

    function upsertItem(tag: Tag) {
        const next = remember(tag);
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const existed = prev.items.some((item) => item.publicId === next.publicId);
            const without = prev.items.filter((item) => item.publicId !== next.publicId);
            const nextTotal = existed ? prev.totalCount : prev.totalCount + 1;
            setList(key, [...without, next], { totalCount: nextTotal });
        }
        if (!itemsByListKey.has(KEY_LIST)) {
            setList(KEY_LIST, [next], { totalCount: 1 });
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

    function rememberLocalMutation(publicId: string) {
        const id = publicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, 2500)
        );
    }

    function consumeLocalMutation(publicId: string): boolean {
        const id = publicId.trim();
        const timer = recentMutations.get(id);
        if (!timer) return false;
        clearTimeout(timer);
        recentMutations.delete(id);
        return true;
    }

    function clearRecentMutations() {
        for (const timer of recentMutations.values()) clearTimeout(timer);
        recentMutations.clear();
    }

    function notifyDeleted(publicId: string) {
        deletedListeners.forEach((listener) => listener(publicId));
    }

    function subscribeToDeleted(listener: (publicId: string) => void) {
        deletedListeners.add(listener);
        return () => {
            deletedListeners.delete(listener);
        };
    }

    function allKnownItems(): Tag[] {
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): Tag | null {
        const id = publicId.trim();
        if (!id) return null;
        // `items` est la dépendance réactive : `knownById` est une Map non suivie.
        // Sans cette lecture, pastilles et recherche restent sur l’ancien nom / l’id brut.
        const listed = items.value.find((tag) => tag.publicId === id);
        if (listed) return listed;
        return knownById.get(id) ?? null;
    }

    function searchLocal(raw: string): Tag[] {
        return sortTags(allKnownItems().filter((tag) => matchesTagSearch(tag, raw)));
    }

    return {
        items,
        itemsByListKey,
        knownById,
        activeListKey,
        totalCount,
        loading,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        notifyDeleted,
        subscribeToDeleted,
        allKnownItems,
        findByPublicId,
        searchLocal
    };
}

export type TagsState = ReturnType<typeof createTagsState>;
