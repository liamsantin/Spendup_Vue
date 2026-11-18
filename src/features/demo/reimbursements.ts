import { AppError } from '@/utils/errors/app-error';
import { demoDb } from '@/features/demo/db';
import type {
    LinkReimbursementPayload,
    ReimbursementCandidate,
    ReimbursementLink,
    TransactionReimbursements
} from '@/features/transactions/reimbursements';
import type { Transaction } from '@/features/transactions/types';

/** Liens facture ↔ remboursement du mode démo : même règles que l'API (revenu → dépense, part reliée, plafond du remboursement). */

type Result = { status: number; body: unknown } | null;

const ok = (body: unknown) => ({ status: 200, body });

function find(id: string): Transaction {
    const tx = demoDb().transactions.find((row) => row.publicId === id);
    if (!tx) throw new AppError('Transaction introuvable.', 404);
    return tx;
}

function amountOf(tx: Transaction): number {
    return tx.amount ?? 0;
}

function build(tx: Transaction): TransactionReimbursements {
    const db = demoDb();
    const link = (reimbursementId: string, invoiceId: string, amount: number): ReimbursementLink => {
        const reimbursement = find(reimbursementId);
        const invoice = find(invoiceId);
        return {
            invoicePublicId: invoice.publicId,
            invoiceLabel: invoice.label,
            reimbursementPublicId: reimbursement.publicId,
            reimbursementLabel: reimbursement.label,
            reimbursementDate: reimbursement.operationDate,
            amount
        };
    };
    const reimbursements = db.reimbursementLinks
        .filter((item) => item.invoicePublicId === tx.publicId)
        .map((item) => link(item.reimbursementPublicId, item.invoicePublicId, item.amount));
    const invoices = db.reimbursementLinks
        .filter((item) => item.reimbursementPublicId === tx.publicId)
        .map((item) => link(item.reimbursementPublicId, item.invoicePublicId, item.amount));
    const reimbursed = reimbursements.reduce((sum, item) => sum + item.amount, 0);
    const allocated = invoices.reduce((sum, item) => sum + item.amount, 0);
    return {
        publicId: tx.publicId,
        totalAmount: amountOf(tx),
        reimbursed,
        net: Math.max(0, amountOf(tx) - reimbursed),
        allocated,
        remaining: Math.max(0, amountOf(tx) - allocated),
        reimbursements,
        invoices
    };
}

function candidates(reimbursement: Transaction): { items: ReimbursementCandidate[] } {
    const db = demoDb();
    if (reimbursement.type !== 'revenu') return { items: [] };
    const items = db.transactions
        .filter(
            (tx) =>
                tx.type === 'depense' &&
                tx.taxNatureStatus !== 'ecartee' &&
                (tx.taxNature === 'medicalExpense' ||
                    (!tx.taxNature &&
                        db.categories.find((category) => category.publicId === tx.categoryPublicId)?.taxNature === 'medicalExpense')) &&
                tx.operationDate <= reimbursement.operationDate
        )
        .map((tx) => {
            const linked = db.reimbursementLinks
                .filter((item) => item.invoicePublicId === tx.publicId)
                .reduce((sum, item) => sum + item.amount, 0);
            const remaining = amountOf(tx) - linked;
            const reasons: string[] = [];
            if (reimbursement.tierPublicId && tx.tierPublicId === reimbursement.tierPublicId) reasons.push('sameTier');
            if (remaining === amountOf(reimbursement)) reasons.push('sameAmount');
            return { publicId: tx.publicId, label: tx.label, date: tx.operationDate, totalAmount: amountOf(tx), remaining, reasons };
        })
        .filter((item) => item.remaining > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length || b.date.localeCompare(a.date))
        .slice(0, 5);
    return { items };
}

function link(reimbursement: Transaction, body: LinkReimbursementPayload) {
    const db = demoDb();
    const invoice = find(body.invoicePublicId);
    if (reimbursement.type !== 'revenu') throw new AppError('Un remboursement est une transaction de type revenu.', 400);
    if (invoice.type !== 'depense') throw new AppError('La facture doit être une dépense.', 400);
    const amount = Math.round(body.amount * 100) / 100;
    if (!(amount > 0)) throw new AppError('Le montant relié doit être positif.', 400);
    const others = db.reimbursementLinks
        .filter((item) => item.reimbursementPublicId === reimbursement.publicId && item.invoicePublicId !== invoice.publicId)
        .reduce((sum, item) => sum + item.amount, 0);
    if (others + amount > amountOf(reimbursement)) throw new AppError('Le total relié dépasse le montant du remboursement.', 400);
    const existing = db.reimbursementLinks.find(
        (item) => item.reimbursementPublicId === reimbursement.publicId && item.invoicePublicId === invoice.publicId
    );
    if (existing) existing.amount = amount;
    else db.reimbursementLinks.push({ reimbursementPublicId: reimbursement.publicId, invoicePublicId: invoice.publicId, amount });
    return build(reimbursement);
}

/** Routes `/api/transactions/:id/reimbursements…` ; `null` si le chemin n'en fait pas partie. */
export function routeReimbursements(method: string, path: string, body: unknown): Result {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== 'api' || parts[1] !== 'transactions' || parts.length < 4) return null;
    const tx = () => find(decodeURIComponent(parts[2] ?? ''));

    if (parts[3] === 'reimbursement-candidates' && parts.length === 4 && method === 'GET') return ok(candidates(tx()));
    if (parts[3] !== 'reimbursements') return null;
    if (parts.length === 4 && method === 'GET') return ok(build(tx()));
    if (parts.length === 4 && method === 'POST') return ok(link(tx(), body as LinkReimbursementPayload));
    if (parts.length === 5 && method === 'DELETE') {
        const reimbursement = tx();
        const invoiceId = decodeURIComponent(parts[4] ?? '');
        const db = demoDb();
        const before = db.reimbursementLinks.length;
        db.reimbursementLinks = db.reimbursementLinks.filter(
            (item) => !(item.reimbursementPublicId === reimbursement.publicId && item.invoicePublicId === invoiceId)
        );
        if (db.reimbursementLinks.length === before) throw new AppError('Lien introuvable.', 404);
        return ok(build(reimbursement));
    }
    return null;
}
