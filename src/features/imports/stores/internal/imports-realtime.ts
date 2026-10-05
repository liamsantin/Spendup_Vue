import { useNotificationsStore } from '@/features/notifications';
import type { ImportChangedPayload, ImportTemplateChangedPayload } from '@/features/notifications';
import type { ImportsCrud } from '@/features/imports/stores/internal/imports-crud';
import type { ImportsState } from '@/features/imports/stores/internal/imports-state';
import type { ImportsTemplates } from '@/features/imports/stores/internal/imports-templates';

type RealtimeDeps = Pick<ImportsCrud, 'refetchList' | 'refreshCurrent'> &
    Pick<ImportsTemplates, 'refetchTemplates' | 'removeTemplateLocal'>;

/**
 * `importChanged` : envoyé au créateur, **y compris** la session qui a fait l’action (multi-onglets).
 * Les échos de nos propres mutations sont ignorés via `consumeLocalMutation`.
 * `importTemplateChanged` : modèles perso.
 */
export function createImportsRealtime(state: ImportsState, deps: RealtimeDeps) {
    const { current, initialized, templatesLoaded, consumeLocalMutation, removeImportLocal } = state;
    const { refetchList, refreshCurrent, refetchTemplates, removeTemplateLocal } = deps;

    let unsubscribeImportChanged: (() => void) | null = null;
    let unsubscribeTemplateChanged: (() => void) | null = null;
    let listRefreshScheduled = false;
    let currentRefreshScheduled = false;
    let templatesRefreshScheduled = false;

    function scheduleListRefetch() {
        if (listRefreshScheduled) return;
        listRefreshScheduled = true;
        queueMicrotask(() => {
            listRefreshScheduled = false;
            if (!initialized.value) return;
            void refetchList();
        });
    }

    function scheduleCurrentRefresh() {
        if (currentRefreshScheduled) return;
        currentRefreshScheduled = true;
        queueMicrotask(() => {
            currentRefreshScheduled = false;
            void refreshCurrent();
        });
    }

    function scheduleTemplatesRefetch() {
        if (templatesRefreshScheduled) return;
        templatesRefreshScheduled = true;
        queueMicrotask(() => {
            templatesRefreshScheduled = false;
            if (!templatesLoaded.value) return;
            void refetchTemplates();
        });
    }

    function handleImportChanged(payload: ImportChangedPayload) {
        const { change, importPublicId } = payload;
        if (consumeLocalMutation(importPublicId)) return;

        if (change === 'importDeleted') {
            removeImportLocal(importPublicId);
            return;
        }

        scheduleListRefetch();
        if (current.value?.publicId === importPublicId) scheduleCurrentRefresh();
    }

    function handleTemplateChanged(payload: ImportTemplateChangedPayload) {
        const { change, templatePublicId } = payload;
        if (consumeLocalMutation(templatePublicId)) return;
        if (change === 'importTemplateDeleted') {
            removeTemplateLocal(templatePublicId);
            return;
        }
        scheduleTemplatesRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeImportChanged && unsubscribeTemplateChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeImportChanged ??= notifications.subscribeToImportChanged(handleImportChanged);
        unsubscribeTemplateChanged ??= notifications.subscribeToImportTemplateChanged(handleTemplateChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeImportChanged?.();
        unsubscribeImportChanged = null;
        unsubscribeTemplateChanged?.();
        unsubscribeTemplateChanged = null;
        listRefreshScheduled = false;
        currentRefreshScheduled = false;
        templatesRefreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleImportChanged,
        handleTemplateChanged
    };
}

export type ImportsRealtime = ReturnType<typeof createImportsRealtime>;
