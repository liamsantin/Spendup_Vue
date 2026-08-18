import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { AppError } from '@/utils/errors/app-error';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { accountsApi } from '../api';
import type {
    Account,
    AccountBalanceSnapshot,
    AccountShare,
    CreateAccountPayload,
    CreateBalanceSnapshotPayload,
    IncomingAccountShare,
    ShareRole,
    UpdateAccountPayload
} from '../types';

export const ACCOUNTS_LIST_MAX_AGE_MS = 60_000;
export const ACCOUNTS_DETAIL_MAX_AGE_MS = 30_000;

const KEY_ACCOUNTS = 'accounts';
const KEY_INCOMING = 'incoming';

/**
 * Fetch budget (TTL 60s list / 30s detail, hors invalidation realtime / refresh manuel) :
 * - 1ère visite onglet actif : 1 list
 * - switch onglet frais : 0
 * - open détail avec snapshot liste : 0–1 selon TTL
 *
 * `ensure` par défaut ; `force` seulement refresh user, mutation qui a besoin du serveur, ou realtime.
 */
export const useAccountsStore = defineStore('accounts', () => {
    const accounts = ref<Account[]>([]);
    const incomingShares = ref<IncomingAccountShare[]>([]);
    const selectedAccount = ref<Account | null>(null);
    const shares = ref<AccountShare[]>([]);
    const sharesByAccountId = new Map<string, AccountShare[]>();
    const balanceSnapshots = ref<AccountBalanceSnapshot[]>([]);
    const snapshotsByAccountId = new Map<string, AccountBalanceSnapshot[]>();

    const loadingAccounts = ref(false);
    const loadingIncoming = ref(false);
    const loadingDetail = ref(false);
    const loadingShares = ref(false);
    const loadingSnapshots = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);
    /** Deep-link : `?account=` */
    const focusAccountPublicId = ref<string | null>(null);
    /** Deep-link invitations : `?share=` */
    const focusSharePublicId = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: ACCOUNTS_LIST_MAX_AGE_MS });

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;
    let prefetchTimer: ReturnType<typeof setTimeout> | number | null = null;

    const ownedAccounts = computed(() => accounts.value.filter((a) => a.isOwned));
    const sharedAccounts = computed(() => accounts.value.filter((a) => !a.isOwned));
    const activeOwnedAccounts = computed(() =>
        ownedAccounts.value
            .filter((a) => a.isActive)
            .slice()
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    );
    const archivedOwnedAccounts = computed(() => ownedAccounts.value.filter((a) => !a.isActive));
    const incomingCount = computed(() => incomingShares.value.length);
    const hasAccounts = computed(() => accounts.value.length > 0);
    /** Compte qui vient d’être promu principal — déclenche l’animation de highlight. */
    const promotedAccountPublicId = ref<string | null>(null);
    let promoteHighlightTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPromoteHighlight() {
        if (promoteHighlightTimer) {
            clearTimeout(promoteHighlightTimer);
            promoteHighlightTimer = null;
        }
        promotedAccountPublicId.value = null;
    }

    function markPromoted(publicId: string) {
        clearPromoteHighlight();
        promotedAccountPublicId.value = publicId;
        promoteHighlightTimer = setTimeout(() => {
            if (promotedAccountPublicId.value === publicId) {
                promotedAccountPublicId.value = null;
            }
            promoteHighlightTimer = null;
        }, 900);
    }

    function isPromotedAccount(publicId: string) {
        return promotedAccountPublicId.value === publicId;
    }

    function applyPrimaryLocally(publicId: string, account?: Account) {
        const previousPrimaryId = accounts.value.find((a) => a.isOwned && a.isPrimary && a.publicId !== publicId)?.publicId;
        accounts.value = accounts.value.map((a) => {
            if (!a.isOwned) return a;
            if (a.publicId === publicId) {
                return { ...(account ?? a), isPrimary: true };
            }
            return a.isPrimary ? { ...a, isPrimary: false } : a;
        });
        if (selectedAccount.value) {
            const selectedId = selectedAccount.value.publicId;
            const next = accounts.value.find((a) => a.publicId === selectedId);
            if (next) selectedAccount.value = next;
        }
        if (previousPrimaryId) cache.invalidate(`detail:${previousPrimaryId}`);
        cache.touch(`detail:${publicId}`);
        cache.touch(KEY_ACCOUNTS);
    }

    function clearError() {
        error.value = null;
    }

    function setFocusAccount(publicId: string | null) {
        focusAccountPublicId.value = publicId?.trim() || null;
    }

    function setFocusShare(publicId: string | null) {
        focusSharePublicId.value = publicId?.trim() || null;
    }

    function isFocusedAccount(publicId: string) {
        return !!focusAccountPublicId.value && focusAccountPublicId.value === publicId;
    }

    function isFocusedShare(publicId: string) {
        return !!focusSharePublicId.value && focusSharePublicId.value === publicId;
    }

    function upsertAccount(account: Account, prepend = false) {
        const idx = accounts.value.findIndex((a) => a.publicId === account.publicId);
        if (idx >= 0) {
            accounts.value = [...accounts.value.slice(0, idx), account, ...accounts.value.slice(idx + 1)];
        } else {
            accounts.value = prepend ? [account, ...accounts.value] : [...accounts.value, account];
        }
        if (selectedAccount.value?.publicId === account.publicId) {
            selectedAccount.value = account;
        }
    }

    function removeAccountLocal(publicId: string) {
        accounts.value = accounts.value.filter((a) => a.publicId !== publicId);
        if (selectedAccount.value?.publicId === publicId) {
            selectedAccount.value = null;
            shares.value = [];
        }
        sharesByAccountId.delete(publicId);
        cache.invalidate(`detail:${publicId}`);
        cache.invalidate(`shares:${publicId}`);
    }

    function hydrateSelectedFromList(publicId: string) {
        const snapshot = accounts.value.find((a) => a.publicId === publicId);
        if (snapshot) selectedAccount.value = snapshot;
    }

    function setSharesForAccount(accountPublicId: string, items: AccountShare[]) {
        sharesByAccountId.set(accountPublicId, items);
        shares.value = items;
    }

    function setSnapshotsForAccount(accountPublicId: string, items: AccountBalanceSnapshot[]) {
        snapshotsByAccountId.set(accountPublicId, items);
        balanceSnapshots.value = items;
    }

    function cancelIdlePrefetch() {
        if (prefetchTimer == null) return;
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(prefetchTimer as number);
        }
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
    }

    function scheduleIdlePrefetch(tab: 'Accounts' | 'Invitations') {
        if (import.meta.env.VITEST) return;
        cancelIdlePrefetch();
        const run = () => {
            prefetchTimer = null;
            if (tab === 'Accounts') {
                void loadIncoming().catch(() => undefined);
                return;
            }
            void loadAccounts().catch(() => undefined);
        };
        if (typeof requestIdleCallback === 'function') {
            prefetchTimer = requestIdleCallback(run, { timeout: 2000 });
            return;
        }
        prefetchTimer = setTimeout(run, 2000);
    }

    async function loadAccounts(force = false) {
        await cache.ensure(
            KEY_ACCOUNTS,
            async () => {
                loadingAccounts.value = true;
                clearError();
                try {
                    const result = await accountsApi.list();
                    accounts.value = Array.isArray(result?.items) ? result.items : [];
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingAccounts.value = false;
                }
            },
            { force }
        );
    }

    async function loadIncoming(force = false) {
        await cache.ensure(
            KEY_INCOMING,
            async () => {
                loadingIncoming.value = true;
                clearError();
                try {
                    const result = await accountsApi.listIncomingShares();
                    incomingShares.value = Array.isArray(result?.items) ? result.items : [];
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingIncoming.value = false;
                }
            },
            { force }
        );
    }

    async function loadAccountDetail(publicId: string, force = false) {
        hydrateSelectedFromList(publicId);
        await cache.ensure(
            `detail:${publicId}`,
            async () => {
                loadingDetail.value = true;
                clearError();
                try {
                    const account = await accountsApi.get(publicId);
                    selectedAccount.value = account;
                    upsertAccount(account);
                    return;
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    if (!accounts.value.some((a) => a.publicId === publicId)) {
                        selectedAccount.value = null;
                    }
                    throw e;
                } finally {
                    loadingDetail.value = false;
                }
            },
            { force, maxAgeMs: ACCOUNTS_DETAIL_MAX_AGE_MS }
        );
        if (selectedAccount.value?.publicId !== publicId) {
            hydrateSelectedFromList(publicId);
        }
        return selectedAccount.value;
    }

    async function loadShares(accountPublicId: string, force = false) {
        await cache.ensure(
            `shares:${accountPublicId}`,
            async () => {
                loadingShares.value = true;
                clearError();
                try {
                    const result = await accountsApi.listShares(accountPublicId);
                    setSharesForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingShares.value = false;
                }
            },
            { force }
        );
        shares.value = sharesByAccountId.get(accountPublicId) ?? [];
    }

    async function loadBalanceSnapshots(accountPublicId: string, force = false) {
        await cache.ensure(
            `snapshots:${accountPublicId}`,
            async () => {
                loadingSnapshots.value = true;
                clearError();
                try {
                    const result = await accountsApi.listBalanceSnapshots(accountPublicId);
                    setSnapshotsForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingSnapshots.value = false;
                }
            },
            { force }
        );
        balanceSnapshots.value = snapshotsByAccountId.get(accountPublicId) ?? [];
    }

    async function createBalanceSnapshot(accountPublicId: string, payload: CreateBalanceSnapshotPayload) {
        acting.value = true;
        clearError();
        try {
            const snapshot = await accountsApi.createBalanceSnapshot(accountPublicId, payload);
            const current = snapshotsByAccountId.get(accountPublicId) ?? balanceSnapshots.value;
            setSnapshotsForAccount(accountPublicId, [snapshot, ...current]);
            cache.touch(`snapshots:${accountPublicId}`);
            return snapshot;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function deleteBalanceSnapshot(accountPublicId: string, snapshotPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.deleteBalanceSnapshot(accountPublicId, snapshotPublicId);
            const current = snapshotsByAccountId.get(accountPublicId) ?? balanceSnapshots.value;
            setSnapshotsForAccount(
                accountPublicId,
                current.filter((s) => s.publicId !== snapshotPublicId)
            );
            cache.touch(`snapshots:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function createAccount(payload: CreateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.create(payload);
            upsertAccount(account, true);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${account.publicId}`);
            const onlyOwned = accounts.value.filter((a) => a.isOwned).length === 1;
            if (account.isOwned && (account.isPrimary || onlyOwned)) {
                applyPrimaryLocally(account.publicId, { ...account, isPrimary: true });
            }
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function updateAccount(publicId: string, payload: UpdateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.update(publicId, payload);
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            if (account.isOwned && account.isPrimary) {
                applyPrimaryLocally(account.publicId, account);
            }
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function setPrimary(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.setPrimary(publicId);
            applyPrimaryLocally(publicId, account);
            markPromoted(publicId);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function archiveAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.archive(publicId);
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function restoreAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.restore(publicId);
            upsertAccount(account);
            cache.touch(KEY_ACCOUNTS);
            cache.touch(`detail:${publicId}`);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function deleteAccount(publicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.remove(publicId);
            removeAccountLocal(publicId);
            cache.touch(KEY_ACCOUNTS);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function inviteShare(accountPublicId: string, userPublicId: string, role: ShareRole) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.inviteShare(accountPublicId, { userPublicId, role });
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            const next = idx >= 0 ? [...current.slice(0, idx), share, ...current.slice(idx + 1)] : [...current, share];
            setSharesForAccount(accountPublicId, next);
            cache.touch(`shares:${accountPublicId}`);
            return share;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function updateShareRole(accountPublicId: string, userPublicId: string, role: ShareRole) {
        acting.value = true;
        clearError();
        try {
            const share = await accountsApi.updateShareRole(accountPublicId, userPublicId, { role });
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
            const idx = current.findIndex((s) => s.userPublicId === userPublicId);
            if (idx >= 0) {
                setSharesForAccount(accountPublicId, [...current.slice(0, idx), share, ...current.slice(idx + 1)]);
                cache.touch(`shares:${accountPublicId}`);
            } else {
                await loadShares(accountPublicId, true);
            }
            return share;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function revokeShare(accountPublicId: string, userPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.revokeShare(accountPublicId, userPublicId);
            const current = sharesByAccountId.get(accountPublicId) ?? shares.value;
            setSharesForAccount(
                accountPublicId,
                current.filter((s) => s.userPublicId !== userPublicId)
            );
            cache.touch(`shares:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function acceptShare(sharePublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.acceptShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
            await loadAccounts(true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function refuseShare(sharePublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.refuseShare(sharePublicId);
            incomingShares.value = incomingShares.value.filter((s) => s.publicId !== sharePublicId);
            cache.touch(KEY_INCOMING);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function refreshAll() {
        cache.invalidate(KEY_ACCOUNTS);
        cache.invalidate(KEY_INCOMING);
        await Promise.all([loadAccounts(true), loadIncoming(true)]);
    }

    function handleRealtime(notification: AppNotification) {
        const type = String(notification.type);
        if (type === 'accountShareInvite' || type === 'accountShareRevoked') {
            cache.invalidate(KEY_INCOMING);
            cache.invalidate(KEY_ACCOUNTS);
            void Promise.all([loadIncoming(true), loadAccounts(true)]).catch(() => undefined);
            return;
        }
        if (type === 'accountShareAccepted' || type === 'accountShareRefused') {
            cache.invalidate(KEY_ACCOUNTS);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value && selectedAccount.value.isOwned) {
                cache.invalidate(`shares:${selectedAccount.value.publicId}`);
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
        }
    }

    function handleFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change) return;
        if (payload.change === 'removed' || payload.change === 'blocked') {
            cache.invalidate('*');
            void refreshAll().catch(() => undefined);
            if (selectedAccount.value?.isOwned) {
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
        }
    }

    function ensureRealtimeBridge() {
        if (unsubscribeNotifications && unsubscribeFriendshipChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeNotifications ??= notifications.subscribeToAccountShareNotifications(handleRealtime);
        unsubscribeFriendshipChanged ??= notifications.subscribeToFriendshipChanged(handleFriendshipChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    async function openTab(tab: 'Accounts' | 'Invitations') {
        ensureRealtimeBridge();
        if (tab === 'Accounts') {
            await loadAccounts();
            return;
        }
        await loadIncoming();
    }

    async function bootstrap(tab: 'Accounts' | 'Invitations' = 'Accounts') {
        ensureRealtimeBridge();
        await openTab(tab);
        if (!initialized.value) {
            initialized.value = true;
            scheduleIdlePrefetch(tab);
        }
    }

    function clearSelected() {
        selectedAccount.value = null;
    }

    function reset() {
        cancelIdlePrefetch();
        cache.reset();
        sharesByAccountId.clear();
        snapshotsByAccountId.clear();
        accounts.value = [];
        incomingShares.value = [];
        selectedAccount.value = null;
        shares.value = [];
        balanceSnapshots.value = [];
        loadingAccounts.value = false;
        loadingIncoming.value = false;
        loadingDetail.value = false;
        loadingShares.value = false;
        loadingSnapshots.value = false;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        focusAccountPublicId.value = null;
        focusSharePublicId.value = null;
        clearPromoteHighlight();
        unsubscribeNotifications?.();
        unsubscribeFriendshipChanged?.();
        unsubscribeNotifications = null;
        unsubscribeFriendshipChanged = null;
    }

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        accounts,
        incomingShares,
        selectedAccount,
        shares,
        balanceSnapshots,
        loadingAccounts,
        loadingIncoming,
        loadingDetail,
        loadingShares,
        loadingSnapshots,
        acting,
        initialized,
        error,
        focusAccountPublicId,
        focusSharePublicId,
        promotedAccountPublicId,
        ownedAccounts,
        sharedAccounts,
        activeOwnedAccounts,
        archivedOwnedAccounts,
        incomingCount,
        hasAccounts,
        clearError,
        setFocusAccount,
        setFocusShare,
        isFocusedAccount,
        isFocusedShare,
        isPromotedAccount,
        loadAccounts,
        loadIncoming,
        loadAccountDetail,
        loadShares,
        loadBalanceSnapshots,
        createBalanceSnapshot,
        deleteBalanceSnapshot,
        createAccount,
        updateAccount,
        setPrimary,
        archiveAccount,
        restoreAccount,
        deleteAccount,
        inviteShare,
        updateShareRole,
        revokeShare,
        acceptShare,
        refuseShare,
        refreshAll,
        onAuthenticatedSession,
        bootstrap,
        openTab,
        clearSelected,
        reset,
        toAppError
    };
});
