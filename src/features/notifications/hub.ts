import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth';
import { getApiBaseUrl, isAuthCookieMode } from '@/utils/helpers/axios-helpers';
import { isDemoSession } from '@/features/demo/session';
import type {
    AccountChangedPayload,
    CategoryChangedPayload,
    TagChangedPayload,
    FriendshipChangedPayload,
    InboxClearedPayload,
    NotificationConnectedPayload,
    NotificationReceivedPayload,
    RecurringExpenseChangedPayload,
    RecurringIncomeChangedPayload,
    SessionEndedPayload,
    TierChangedPayload,
    BudgetChangedPayload,
    SavingsGoalChangedPayload,
    ImportChangedPayload,
    ImportTemplateChangedPayload,
    AssetChangedPayload,
    LiabilityChangedPayload,
    PersonalLoanChangedPayload,
    SharedDebtChangedPayload
} from '@/features/notifications/types';

export type NotificationsHubHandlers = {
    onConnected?: (payload: NotificationConnectedPayload) => void;
    onNotificationReceived?: (payload: NotificationReceivedPayload) => void;
    onFriendshipChanged?: (payload: FriendshipChangedPayload) => void;
    onAccountChanged?: (payload: AccountChangedPayload) => void;
    onCategoryChanged?: (payload: CategoryChangedPayload) => void;
    onTagChanged?: (payload: TagChangedPayload) => void;
    onTierChanged?: (payload: TierChangedPayload) => void;
    onRecurringExpenseChanged?: (payload: RecurringExpenseChangedPayload) => void;
    onRecurringIncomeChanged?: (payload: RecurringIncomeChangedPayload) => void;
    onBudgetChanged?: (payload: BudgetChangedPayload) => void;
    onSavingsGoalChanged?: (payload: SavingsGoalChangedPayload) => void;
    onImportChanged?: (payload: ImportChangedPayload) => void;
    onImportTemplateChanged?: (payload: ImportTemplateChangedPayload) => void;
    onAssetChanged?: (payload: AssetChangedPayload) => void;
    onLiabilityChanged?: (payload: LiabilityChangedPayload) => void;
    onPersonalLoanChanged?: (payload: PersonalLoanChangedPayload) => void;
    onSharedDebtChanged?: (payload: SharedDebtChangedPayload) => void;
    onInboxCleared?: (payload: InboxClearedPayload) => void;
    onSessionEnded?: (payload: SessionEndedPayload) => void | Promise<void>;
    /** Après reconnexion (auto ou relance après fermeture) : resynchroniser ce qui a pu être poussé pendant la coupure. */
    onReconnected?: () => void | Promise<void>;
    /** Connexion perdue (reconnexion en cours ou fermeture définitive). */
    onDisconnected?: () => void;
};

let connection: HubConnection | null = null;
let handlers: NotificationsHubHandlers = {};
let startPromise: Promise<void> | null = null;

/** Arrêt volontaire (déconnexion) : aucune relance automatique. */
let stopped = true;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let restartAttempt = 0;
let wakeListenersAttached = false;

/** Délai de relance après une fermeture définitive : 5 s, 10 s, 20 s… plafonné à 5 min. */
export function hubRestartDelayMs(attempt: number): number {
    return Math.min(300_000, 5_000 * 2 ** Math.max(0, attempt));
}

function clearRestartTimer() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
}

/**
 * `withAutomaticReconnect` abandonne après ~42 s (veille, réseau coupé) : sans relance, plus aucun événement
 * (notifications, `sessionEnded`) jusqu'à la navigation suivante. On relance avec un délai croissant.
 */
function scheduleRestart() {
    if (stopped || restartTimer) return;
    const delay = hubRestartDelayMs(restartAttempt);
    restartAttempt += 1;
    restartTimer = setTimeout(() => {
        restartTimer = null;
        void startNotificationsHub()
            .then(() => {
                restartAttempt = 0;
            })
            .catch(() => scheduleRestart());
    }, delay);
}

/** Retour du réseau ou de l'onglet : relance immédiate si la connexion est fermée. */
function restartNowIfClosed() {
    if (stopped || !connection || connection.state !== HubConnectionState.Disconnected) return;
    clearRestartTimer();
    restartAttempt = 0;
    void startNotificationsHub().catch(() => scheduleRestart());
}

function attachWakeListeners() {
    if (wakeListenersAttached || typeof window === 'undefined') return;
    wakeListenersAttached = true;
    window.addEventListener('online', restartNowIfClosed);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') restartNowIfClosed();
    });
}

/** Cookie `spendup_access` est Path=/api — hors scope du hub `/hubs/realtime`. */
export const HUB_ACCESS_TOKEN_REQUIRED = 'SignalR requires an access token in memory (API: ReturnAccessTokenInBody=true).';

function hubUrl(): string {
    return `${getApiBaseUrl()}/hubs/realtime`;
}

/**
 * JWT pour negotiate / WebSocket.
 * Le client SignalR pose `Authorization: Bearer` (HTTP) et `?access_token=` (WebSocket).
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
    conn.off('categoryChanged');
    conn.off('tagChanged');
    conn.off('tierChanged');
    conn.off('recurringExpenseChanged');
    conn.off('recurringIncomeChanged');
    conn.off('budgetChanged');
    conn.off('savingsGoalChanged');
    conn.off('importChanged');
    conn.off('importTemplateChanged');
    conn.off('assetChanged');
    conn.off('liabilityChanged');
    conn.off('personalLoanChanged');
    conn.off('sharedDebtChanged');
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

    conn.on('categoryChanged', (payload: CategoryChangedPayload) => {
        handlers.onCategoryChanged?.(payload);
    });

    conn.on('tagChanged', (payload: TagChangedPayload) => {
        handlers.onTagChanged?.(payload);
    });

    conn.on('tierChanged', (payload: TierChangedPayload) => {
        handlers.onTierChanged?.(payload);
    });

    conn.on('recurringExpenseChanged', (payload: RecurringExpenseChangedPayload) => {
        handlers.onRecurringExpenseChanged?.(payload);
    });

    conn.on('recurringIncomeChanged', (payload: RecurringIncomeChangedPayload) => {
        handlers.onRecurringIncomeChanged?.(payload);
    });

    conn.on('budgetChanged', (payload: BudgetChangedPayload) => {
        handlers.onBudgetChanged?.(payload);
    });

    conn.on('savingsGoalChanged', (payload: SavingsGoalChangedPayload) => {
        handlers.onSavingsGoalChanged?.(payload);
    });

    conn.on('importChanged', (payload: ImportChangedPayload) => {
        handlers.onImportChanged?.(payload);
    });

    conn.on('importTemplateChanged', (payload: ImportTemplateChangedPayload) => {
        handlers.onImportTemplateChanged?.(payload);
    });

    conn.on('assetChanged', (payload: AssetChangedPayload) => {
        handlers.onAssetChanged?.(payload);
    });

    conn.on('liabilityChanged', (payload: LiabilityChangedPayload) => {
        handlers.onLiabilityChanged?.(payload);
    });

    conn.on('personalLoanChanged', (payload: PersonalLoanChangedPayload) => {
        handlers.onPersonalLoanChanged?.(payload);
    });

    conn.on('sharedDebtChanged', (payload: SharedDebtChangedPayload) => {
        handlers.onSharedDebtChanged?.(payload);
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
        notifyReconnected();
    });

    conn.onreconnecting(() => {
        handlers.onDisconnected?.();
    });

    // fermeture définitive (reconnexion auto abandonnée, serveur arrêté) : relance par nos soins
    conn.onclose(() => {
        if (conn !== connection) return;
        handlers.onDisconnected?.();
        scheduleRestart();
    });

    return conn;
}

/** Les événements émis pendant la coupure sont perdus : les stores resynchronisent (badge, inbox, listes). */
function notifyReconnected() {
    try {
        void Promise.resolve(handlers.onReconnected?.()).catch(() => undefined);
    } catch {
        // ignore
    }
}

export function setNotificationsHubHandlers(next: NotificationsHubHandlers) {
    handlers = next;
    if (connection) attachHandlers(connection);
}

export function getNotificationsHubState(): HubConnectionState | null {
    return connection?.state ?? null;
}

export async function startNotificationsHub(): Promise<void> {
    // mode démo : aucune session réelle, aucune requête vers l'API (le jeton « demo » finirait en 401)
    if (isDemoSession()) return;
    stopped = false;
    attachWakeListeners();
    if (connection?.state === HubConnectionState.Connected) return;
    // reconnexion automatique en cours : ne pas appeler start() dessus (rejet, refresh et nouvelle connexion inutiles)
    if (connection && (connection.state === HubConnectionState.Reconnecting || connection.state === HubConnectionState.Connecting)) return;
    if (startPromise) return startPromise;

    startPromise = (async () => {
        // Échoue tôt si aucun JWT mémoire (évite un start opaque 401).
        await accessTokenFactory();

        // une connexion déjà ouverte puis fermée : sa relance doit resynchroniser ce qui a été manqué
        const restarting = !!connection;
        if (!connection) {
            connection = buildConnection();
        } else {
            attachHandlers(connection);
        }

        if (connection.state === HubConnectionState.Connected) return;

        clearRestartTimer();
        try {
            await connection.start();
            if (restarting) notifyReconnected();
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
            if (restarting) notifyReconnected();
        }
    })();

    try {
        await startPromise;
    } finally {
        startPromise = null;
    }
}

export async function stopNotificationsHub(): Promise<void> {
    stopped = true;
    clearRestartTimer();
    restartAttempt = 0;
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
