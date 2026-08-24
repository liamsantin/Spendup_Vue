import { isPermissionGranted, requestPermission, sendNotification, onAction } from '@tauri-apps/plugin-notification';
import type { AppNotification } from '@/features/notifications/types';
import { isSafeAppNotificationPath, resolveNotificationLink } from '@/features/notifications/link';
import { isTauri } from '@/utils/helpers/platform-helpers';

let actionListenerReady = false;
let navigateHandler: ((path: string) => void) | null = null;

/** Enregistre le navigateur Vue pour les clics sur notifs OS. */
export function setNativeNotificationNavigate(handler: ((path: string) => void) | null) {
    navigateHandler = handler;
}

async function ensureActionListener() {
    if (actionListenerReady || !isTauri()) return;
    actionListenerReady = true;
    try {
        await onAction((notification) => {
            const extra = notification.extra as { link?: string } | undefined;
            const link = extra?.link;
            // Re-valide au clic : ne jamais router.push un chemin hors /app…
            if (link && navigateHandler && isSafeAppNotificationPath(link)) {
                navigateHandler(link);
            }
        });
    } catch {
        // Plugin / plateforme sans actions — non bloquant
    }
}

/** Demande la permission OS (no-op hors Tauri). */
export async function ensureNativeNotificationPermission(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
        let granted = await isPermissionGranted();
        if (!granted) {
            const permission = await requestPermission();
            granted = permission === 'granted';
        }
        if (granted) {
            await ensureActionListener();
        }
        return granted;
    } catch {
        return false;
    }
}

/** Affiche une notification OS pour un item inbox (appelant : gate prefs). */
export async function showNativeNotification(notification: AppNotification): Promise<void> {
    if (!isTauri()) return;
    const granted = await ensureNativeNotificationPermission();
    if (!granted) return;

    const link = resolveNotificationLink(notification.link, notification) ?? undefined;
    try {
        sendNotification({
            title: notification.title,
            body: notification.subtitle || notification.message || undefined,
            extra: link ? { link } : undefined
        });
    } catch {
        // Non bloquant
    }
}
