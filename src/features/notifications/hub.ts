import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth';
import { getApiBaseUrl, isAuthCookieMode } from '@/utils/helpers/axios-helpers';
import type {
    AccountChangedPayload,
    FriendshipChangedPayload,
    InboxClearedPayload,
    NotificationConnectedPayload,
    NotificationReceivedPayload,
    SessionEndedPayload
} from '@/features/notifications/types';

export type NotificationsHubHandlers = {
    onConnected?: (payload: NotificationConnectedPayload) => void;
    onNotificationReceived?: (payload: NotificationReceivedPayload) => void;
    onFriendshipChanged?: (payload: FriendshipChangedPayload) => void;
    onAccountChanged?: (payload: AccountChangedPayload) => void;
    onInboxCleared?: (payload: InboxClearedPayload) => void;
    onSessionEnded?: (payload: SessionEndedPayload) => void | Promise<void>;
};

let connection: HubConnection | null = null;
let handlers: NotificationsHubHandlers = {};
let startPromise: Promise<void> | null = null;

/** Cookie `spendup_access` est Path=/api — hors scope du hub `/hubs/realtime`. */
export const HUB_ACCESS_TOKEN_REQUIRED =
    'SignalR requires an access token in memory (API: ReturnAccessTokenInBody=true, or cookie Path covering /hubs).';

function hubUrl(): string {
    return `${getApiBaseUrl()}/hubs/realtime`;
}

/**
 * Jeton pour negotiate/WebSocket (`?access_token=`).
 * En cookie-mode le cookie HttpOnly ne couvre pas `/hubs` → un access JWT mémoire est obligatoire.
 */
async function accessTokenFactory(): Promise<string> {
    const auth = useAuthStore();
    let token = (await auth.ensureAccessToken())?.trim() || '';
    if (token) return token;

    // Refresh une fois : souvent le body renvoie un access même en cookie-mode.
    const refreshed = await auth.refreshSession();
    if (refreshed) {
        token = String(auth.accessToken ?? '').trim();
        if (token) return token;
    }

    throw new Error(HUB_ACCESS_TOKEN_REQUIRED);
}

function attachHandlers(conn: HubConnection) {
    conn.off('connected');
    conn.off('notificationReceived');
    conn.off('friendshipChanged');
    conn.off('accountChanged');
    conn.off('inboxCleared');
    conn.off('sessionEnded');

    conn.on('connected', (payload: NotificationConnectedPayload) => {
        handlers.onConnected?.(payload);
    });

    conn.on('notificationReceived', (payload: NotificationReceivedPayload) => {
        handlers.onNotificationReceived?.(payload);
    });

    conn.on('friendshipChanged', (payload: FriendshipChangedPayload) => {
        handlers.onFriendshipChanged?.(payload);
    });

    conn.on('accountChanged', (payload: AccountChangedPayload) => {
        handlers.onAccountChanged?.(payload);
    });

    conn.on('inboxCleared', (payload: InboxClearedPayload) => {
        handlers.onInboxCleared?.(payload);
    });

    conn.on('sessionEnded', (payload: SessionEndedPayload) => {
        handlers.onSessionEnded?.(payload);
    });
}

function buildConnection(): HubConnection {
    const builder = new HubConnectionBuilder()
        .withUrl(hubUrl(), {
            accessTokenFactory,
            withCredentials: isAuthCookieMode()
        })
        .withAutomaticReconnect()
        .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning);

    const conn = builder.build();
    attachHandlers(conn);

    conn.onreconnected(() => {
        attachHandlers(conn);
    });

    return conn;
}

export function setNotificationsHubHandlers(next: NotificationsHubHandlers) {
    handlers = next;
    if (connection) attachHandlers(connection);
}

export function getNotificationsHubState(): HubConnectionState | null {
    return connection?.state ?? null;
}

export async function startNotificationsHub(): Promise<void> {
    if (connection?.state === HubConnectionState.Connected) return;
    if (startPromise) return startPromise;

    startPromise = (async () => {
        // Échoue tôt si aucun JWT mémoire (évite un start opaque 401).
        await accessTokenFactory();

        if (!connection) {
            connection = buildConnection();
        } else {
            attachHandlers(connection);
        }

        if (connection.state === HubConnectionState.Connected) return;

        try {
            await connection.start();
        } catch (firstError) {
            // 401 / échec start → refresh puis une seconde tentative.
            const auth = useAuthStore();
            const refreshed = await auth.refreshSession();
            if (!refreshed) throw firstError;

            if (connection.state !== HubConnectionState.Disconnected) {
                try {
                    await connection.stop();
                } catch {
                    // ignore
                }
            }
            connection = buildConnection();
            await connection.start();
        }
    })();

    try {
        await startPromise;
    } finally {
        startPromise = null;
    }
}

export async function stopNotificationsHub(): Promise<void> {
    startPromise = null;
    const conn = connection;
    connection = null;
    if (!conn) return;
    try {
        if (conn.state !== HubConnectionState.Disconnected) {
            await conn.stop();
        }
    } catch {
        // ignore stop errors on logout
    }
}
