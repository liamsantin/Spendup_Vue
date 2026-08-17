import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { AppError } from '@/utils/errors/app-error';
import { accountsApi } from '../api';
import type { Account, AccountShare, CreateAccountPayload, IncomingAccountShare, ShareRole, UpdateAccountPayload } from '../types';

export const useAccountsStore = defineStore('accounts', () => {
    const accounts = ref<Account[]>([]);
    const incomingShares = ref<IncomingAccountShare[]>([]);
    const selectedAccount = ref<Account | null>(null);
    const shares = ref<AccountShare[]>([]);

    const loadingAccounts = ref(false);
    const loadingIncoming = ref(false);
    const loadingDetail = ref(false);
    const loadingShares = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);
    /** Deep-link : `?account=` */
    const focusAccountPublicId = ref<string | null>(null);
    /** Deep-link invitations : `?share=` */
    const focusSharePublicId = ref<string | null>(null);

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;

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

    function upsertAccount(account: Account) {
        const idx = accounts.value.findIndex((a) => a.publicId === account.publicId);
        if (idx >= 0) {
            accounts.value = [...accounts.value.slice(0, idx), account, ...accounts.value.slice(idx + 1)];
        } else {
            accounts.value = [...accounts.value, account];
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
    }

    async function loadAccounts(force = false) {
        if (loadingAccounts.value && !force) return;
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
    }

    async function loadIncoming(force = false) {
        if (loadingIncoming.value && !force) return;
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
    }

    async function loadAccountDetail(publicId: string) {
        loadingDetail.value = true;
        clearError();
        try {
            const account = await accountsApi.get(publicId);
            selectedAccount.value = account;
            upsertAccount(account);
            return account;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            selectedAccount.value = null;
            throw e;
        } finally {
            loadingDetail.value = false;
        }
    }

    async function loadShares(accountPublicId: string, force = false) {
        if (loadingShares.value && !force) return;
        loadingShares.value = true;
        clearError();
        try {
            const result = await accountsApi.listShares(accountPublicId);
            shares.value = Array.isArray(result?.items) ? result.items : [];
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingShares.value = false;
        }
    }

    async function createAccount(payload: CreateAccountPayload) {
        acting.value = true;
        clearError();
        try {
            const account = await accountsApi.create(payload);
            await loadAccounts(true);
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
            await loadAccounts(true);
            applyPrimaryLocally(publicId);
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
            await loadShares(accountPublicId, true);
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
            const idx = shares.value.findIndex((s) => s.userPublicId === userPublicId);
            if (idx >= 0) {
                shares.value = [...shares.value.slice(0, idx), share, ...shares.value.slice(idx + 1)];
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
            shares.value = shares.value.filter((s) => s.userPublicId !== userPublicId);
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
            await Promise.all([loadIncoming(true), loadAccounts(true)]);
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
            await loadIncoming(true);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function refreshAll() {
        await Promise.all([loadAccounts(true), loadIncoming(true)]);
    }

    function handleRealtime(notification: AppNotification) {
        const type = String(notification.type);
        if (type === 'accountShareInvite' || type === 'accountShareRevoked') {
            void Promise.all([loadIncoming(true), loadAccounts(true)]).catch(() => undefined);
            return;
        }
        if (type === 'accountShareAccepted' || type === 'accountShareRefused') {
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value && selectedAccount.value.isOwned) {
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
        }
    }

    function handleFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change) return;
        if (payload.change === 'removed' || payload.change === 'blocked') {
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

    async function bootstrap() {
        ensureRealtimeBridge();
        if (!initialized.value) {
            await Promise.all([loadAccounts(), loadIncoming()]);
            initialized.value = true;
            return;
        }
        await refreshAll();
    }

    async function openTab(tab: 'Accounts' | 'Invitations') {
        ensureRealtimeBridge();
        if (tab === 'Accounts') {
            await loadAccounts(true);
            return;
        }
        await loadIncoming(true);
    }

    function clearSelected() {
        selectedAccount.value = null;
        shares.value = [];
    }

    function reset() {
        accounts.value = [];
        incomingShares.value = [];
        selectedAccount.value = null;
        shares.value = [];
        loadingAccounts.value = false;
        loadingIncoming.value = false;
        loadingDetail.value = false;
        loadingShares.value = false;
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
        loadingAccounts,
        loadingIncoming,
        loadingDetail,
        loadingShares,
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
