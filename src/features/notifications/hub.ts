import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth';
import { getApiBaseUrl, isAuthCookieMode } from '@/utils/helpers/axios-helpers';
import type { NotificationConnectedPayload, NotificationReceivedPayload, SessionEndedPayload } from './types';

export type NotificationsHubHandlers = {
    onConnected?: (payload: NotificationConnectedPayload) => void;
    onNotificationReceived?: (payload: NotificationReceivedPayload) => void;
    onSessionEnded?: (payload: SessionEndedPayload) => void | Promise<void>;
};

let connection: HubConnection | null = null;
let handlers: NotificationsHubHandlers = {};
let startPromise: Promise<void> | null = null;

function hubUrl(): string {
    return `${getApiBaseUrl()}/hubs/notifications`;
}

async function accessTokenFactory(): Promise<string> {
    const auth = useAuthStore();
    const token = await auth.ensureAccessToken();
    return token ?? '';
}

function attachHandlers(conn: HubConnection) {
    conn.off('connected');
    conn.off('notificationReceived');
    conn.off('sessionEnded');

    conn.on('connected', (payload: NotificationConnectedPayload) => {
        handlers.onConnected?.(payload);
    });

    conn.on('notificationReceived', (payload: NotificationReceivedPayload) => {
        handlers.onNotificationReceived?.(payload);
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
