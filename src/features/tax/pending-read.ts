import type { TaxSuggestion } from '@/features/tax/types';

interface PendingRead {
    items: TaxSuggestion[];
    notice: string;
}

const pending = new Map<string, PendingRead>();

/** Montants lus sur cet appareil, à montrer à l’ouverture du dossier tout juste créé. */
export function stashPendingRead(publicId: string, items: TaxSuggestion[], notice: string) {
    pending.set(publicId, { items, notice });
}

export function takePendingRead(publicId: string): PendingRead | null {
    const value = pending.get(publicId) ?? null;
    pending.delete(publicId);
    return value;
}
