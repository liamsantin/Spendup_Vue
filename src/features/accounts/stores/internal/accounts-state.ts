import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import type { Account, AccountBalanceSnapshot, AccountShare, IncomingAccountShare } from '../../types';

export const ACCOUNTS_LIST_MAX_AGE_MS = 60_000;
export const ACCOUNTS_DETAIL_MAX_AGE_MS = 30_000;

export const KEY_ACCOUNTS = 'accounts';
export const KEY_INCOMING = 'incoming';

/**
 * Crée l’état partagé du store comptes (refs, cache, helpers locaux).
 * @returns L’état et les helpers locaux du store.
 */
export function createAccountsState() {
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
    /** Compte qui vient d’être promu principal — déclenche l’animation de highlight. */
    const promotedAccountPublicId = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: ACCOUNTS_LIST_MAX_AGE_MS });

    let promoteHighlightTimer: ReturnType<typeof setTimeout> | null = null;

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

    /** Annule le timer et retire le highlight de promotion. */
    function clearPromoteHighlight() {
        if (promoteHighlightTimer) {
            clearTimeout(promoteHighlightTimer);
            promoteHighlightTimer = null;
        }
        promotedAccountPublicId.value = null;
    }

    /**
     * Marque un compte comme promu (highlight temporaire ~900 ms).
     * @param publicId Identifiant public du compte promu.
     */
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

    /**
     * Indique si le compte est actuellement mis en évidence après promotion.
     * @param publicId Identifiant public du compte à tester.
     * @returns `true` si le compte est en highlight de promotion.
     */
    function isPromotedAccount(publicId: string) {
        return promotedAccountPublicId.value === publicId;
    }

    /**
     * Applique localement le statut principal et synchronise la sélection / le cache.
     * @param publicId Identifiant public du nouveau compte principal.
     * @param account Données du compte à fusionner (optionnel).
     */
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

    /** Remet le message d’erreur à null. */
    function clearError() {
        error.value = null;
    }

    /**
     * Définit le compte ciblé par deep-link (`?account=`).
     * @param publicId Identifiant public du compte, ou `null` pour effacer.
     */
    function setFocusAccount(publicId: string | null) {
        focusAccountPublicId.value = publicId?.trim() || null;
    }

    /**
     * Définit l’invitation ciblée par deep-link (`?share=`).
     * @param publicId Identifiant public du partage, ou `null` pour effacer.
     */
    function setFocusShare(publicId: string | null) {
        focusSharePublicId.value = publicId?.trim() || null;
    }

    /**
     * Indique si le compte correspond au deep-link courant.
     * @param publicId Identifiant public du compte à tester.
     * @returns `true` si le compte est focalisé.
     */
    function isFocusedAccount(publicId: string) {
        return !!focusAccountPublicId.value && focusAccountPublicId.value === publicId;
    }

    /**
     * Indique si l’invitation correspond au deep-link courant.
     * @param publicId Identifiant public du partage à tester.
     * @returns `true` si le partage est focalisé.
     */
    function isFocusedShare(publicId: string) {
        return !!focusSharePublicId.value && focusSharePublicId.value === publicId;
    }

    /**
     * Insère ou met à jour un compte dans la liste (et la sélection si besoin).
     * @param account Compte à insérer ou remplacer.
     * @param prepend Si `true`, ajoute le nouveau compte en tête de liste.
     */
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

    /**
     * Supprime un compte de la liste et met à jour la sélection / les partages.
     * @param publicId Identifiant public du compte à retirer.
     */
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

    /**
     * Préremplit la sélection depuis le snapshot déjà présent en liste.
     * @param publicId Identifiant public du compte à hydrater.
     */
    function hydrateSelectedFromList(publicId: string) {
        const snapshot = accounts.value.find((a) => a.publicId === publicId);
        if (snapshot) selectedAccount.value = snapshot;
    }

    /**
     * Mémorise les partages d’un compte et met à jour la vue courante.
     * @param accountPublicId Identifiant public du compte.
     * @param items Liste des partages à mémoriser.
     */
    function setSharesForAccount(accountPublicId: string, items: AccountShare[]) {
        sharesByAccountId.set(accountPublicId, items);
        shares.value = items;
    }

    /**
     * Mémorise les snapshots d’un compte et met à jour la vue courante.
     * @param accountPublicId Identifiant public du compte.
     * @param items Liste des snapshots à mémoriser.
     */
    function setSnapshotsForAccount(accountPublicId: string, items: AccountBalanceSnapshot[]) {
        snapshotsByAccountId.set(accountPublicId, items);
        balanceSnapshots.value = items;
    }

    /** Vide le compte actuellement sélectionné. */
    function clearSelected() {
        selectedAccount.value = null;
    }

    return {
        accounts,
        incomingShares,
        selectedAccount,
        shares,
        sharesByAccountId,
        balanceSnapshots,
        snapshotsByAccountId,
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
        cache,
        ownedAccounts,
        sharedAccounts,
        activeOwnedAccounts,
        archivedOwnedAccounts,
        incomingCount,
        hasAccounts,
        clearPromoteHighlight,
        markPromoted,
        isPromotedAccount,
        applyPrimaryLocally,
        clearError,
        setFocusAccount,
        setFocusShare,
        isFocusedAccount,
        isFocusedShare,
        upsertAccount,
        removeAccountLocal,
        hydrateSelectedFromList,
        setSharesForAccount,
        setSnapshotsForAccount,
        clearSelected
    };
}

export type AccountsState = ReturnType<typeof createAccountsState>;
