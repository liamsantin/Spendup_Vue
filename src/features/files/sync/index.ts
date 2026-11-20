import { watch } from 'vue';
import { useAuthStore } from '@/features/auth';
import { useFileSyncStore } from '@/features/files/sync/sync-store';

export { useFileSyncStore } from '@/features/files/sync/sync-store';
export type { SyncStatus } from '@/features/files/sync/sync-plan';

/**
 * App de bureau : démarre la synchro des PDF à la connexion et l'arrête à la déconnexion (le dossier local reste).
 * À appeler une fois après l'installation de Pinia.
 */
export function startDesktopFileSync() {
    const auth = useAuthStore();
    const sync = useFileSyncStore();
    if (!sync.available) return;
    watch(
        () => auth.user?.userPublicId ?? null,
        (account, previous) => {
            if (account === previous) return;
            sync.stop();
            if (account) void sync.start();
        },
        { immediate: true }
    );
}
