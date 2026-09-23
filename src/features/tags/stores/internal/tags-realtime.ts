import { useNotificationsStore } from '@/features/notifications';
import { parseTagChangedPayload } from '@/features/notifications/normalize';
import type { TagChangedPayload } from '@/features/notifications';
import type { TagsCrud } from '@/features/tags/stores/internal/tags-crud';
import type { TagsState } from '@/features/tags/stores/internal/tags-state';

type RealtimeDeps = Pick<TagsCrud, 'refetchList'>;

export function createTagsRealtime(state: TagsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, removeItemLocal, notifyDeleted } = state;
    const { refetchList } = deps;

    let unsubscribeTagChanged: (() => void) | null = null;
    let refreshScheduled = false;

    function scheduleRefetch() {
        if (refreshScheduled) return;
        refreshScheduled = true;
        queueMicrotask(() => {
            refreshScheduled = false;
            if (!initialized.value) return;
            void refetchList();
        });
    }

    function handleTagChanged(payload: TagChangedPayload) {
        const parsed = parseTagChangedPayload(payload);
        if (!parsed) return;
        if (consumeLocalMutation(parsed.tagPublicId)) return;
        if (parsed.change === 'tagDeleted') {
            removeItemLocal(parsed.tagPublicId);
            notifyDeleted(parsed.tagPublicId);
            return;
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeTagChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeTagChanged = notifications.subscribeToTagChanged(handleTagChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeTagChanged?.();
        unsubscribeTagChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleTagChanged
    };
}

export type TagsRealtime = ReturnType<typeof createTagsRealtime>;
