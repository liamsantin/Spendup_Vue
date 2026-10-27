import { AppError } from '@/utils/errors/app-error';
import { investmentsApi } from '@/features/investments/api';
import { normalizePositionsResult } from '@/features/investments/format';
import { INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/investments/types';
import { positionsCacheKey, type InvestmentsState } from '@/features/investments/stores/internal/investments-state';

export type LoadPositionsOptions = { includeClosed?: boolean; force?: boolean };

export function createInvestmentsPositions(state: InvestmentsState) {
    const { loadingPositions, error, cache, initialized, clearError, setPositions, includeClosedFor, forgetAccount } = state;

    const requestSeqByAccount = new Map<string, number>();

    function nextSeq(accountPublicId: string): number {
        const next = (requestSeqByAccount.get(accountPublicId) ?? 0) + 1;
        requestSeqByAccount.set(accountPublicId, next);
        return next;
    }

    function isCurrent(accountPublicId: string, seq: number): boolean {
        return requestSeqByAccount.get(accountPublicId) === seq;
    }

    /**
     * Charge les positions d’un compte. `includeClosed` absent = valeur mémorisée pour ce compte.
     * 404 (compte inconnu / d’un autre utilisateur) → message neutre + retrait local.
     */
    async function loadPositions(accountPublicId: string, options: LoadPositionsOptions = {}) {
        const id = accountPublicId.trim();
        if (!id) return;
        const includeClosed = options.includeClosed ?? includeClosedFor(id);
        const key = positionsCacheKey(id, includeClosed);
        const seq = nextSeq(id);
        // Un seul résultat mémorisé par compte : changer `includeClosed` force le GET même si le cache est frais.
        const force = !!options.force || includeClosed !== includeClosedFor(id) || !state.positionsFor(id);
        loadingPositions.value = true;
        clearError();
        try {
            await cache.ensure(
                key,
                async () => {
                    const result = normalizePositionsResult(await investmentsApi.positions(id, { includeClosed }));
                    if (!isCurrent(id, seq)) return;
                    setPositions(id, result, includeClosed);
                },
                { force }
            );
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (isCurrent(id, seq)) {
                if (err.status === 404) {
                    error.value = INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE;
                    forgetAccount(id);
                } else {
                    error.value = err.message;
                }
            }
            throw err;
        } finally {
            if (isCurrent(id, seq)) {
                loadingPositions.value = false;
                initialized.value = true;
            }
        }
    }

    /** Refetch silencieux des positions (après écriture ou événement temps réel). */
    async function refetchPositions(accountPublicId: string) {
        await loadPositions(accountPublicId, { force: true }).catch(() => undefined);
    }

    function cancelPendingPositions() {
        for (const id of requestSeqByAccount.keys()) nextSeq(id);
        loadingPositions.value = false;
    }

    return { loadPositions, refetchPositions, cancelPendingPositions };
}

export type InvestmentsPositions = ReturnType<typeof createInvestmentsPositions>;
