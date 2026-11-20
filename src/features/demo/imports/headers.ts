/**
 * Lecture locale d'un relevé (mode démo) : reconnaissance des en-têtes.
 * Portage de `Application/Imports/Parsing/ImportHeaderDictionary.cs` de l'API.
 */
import type { ImportMappingField } from '@/features/imports/types';
import type { ImportRow } from '@/features/demo/imports/csv';
import { normalizeText } from '@/features/demo/imports/text';

/** Champs dans l'ordre de l'API (`ImportField`). */
export const IMPORT_FIELDS: ImportMappingField[] = [
    'operationDate',
    'valueDate',
    'label',
    'amount',
    'debit',
    'credit',
    'currency',
    'balance',
    'category',
    'tier',
    'paymentMethod'
];

/** En-têtes FR / DE / EN reconnus, sur le texte normalisé. */
const ENTRIES: [ImportMappingField, string[]][] = [
    [
        'operationDate',
        [
            'date',
            'date operation',
            'date d operation',
            'date de l operation',
            'date comptable',
            'date de comptabilisation',
            'date de transaction',
            'date de la transaction',
            'datum',
            'buchungsdatum',
            'buchung',
            'abschlussdatum',
            'transaktionsdatum',
            'booking date',
            'booked at',
            'transaction date',
            'posting date',
            'date de reservation'
        ]
    ],
    ['valueDate', ['date valeur', 'date de valeur', 'valeur', 'valuta', 'valutadatum', 'valuta date', 'value date']],
    [
        'label',
        [
            'libelle',
            'libelle de l operation',
            'libelle operation',
            'texte',
            'texte de notification',
            'description',
            'description1',
            'text',
            'buchungstext',
            'avisierungstext',
            'beschreibung',
            'beschreibung1',
            'details',
            'communication',
            'motif',
            'verwendungszweck',
            'label',
            'memo',
            'designation',
            'intitule',
            'operation'
        ]
    ],
    ['amount', ['montant', 'betrag', 'amount', 'credit debit amount', 'somme', 'montant de l operation', 'transaction amount']],
    [
        'debit',
        [
            'debit',
            'belastung',
            'lastschrift',
            'depense',
            'depenses',
            'sortie',
            'sorties',
            'withdrawal',
            'withdrawals',
            'ausgabe',
            'ausgaben'
        ]
    ],
    ['credit', ['credit', 'gutschrift', 'revenu', 'revenus', 'entree', 'entrees', 'deposit', 'deposits', 'einnahme', 'einnahmen']],
    ['currency', ['devise', 'monnaie', 'wahrung', 'waehrung', 'currency']],
    ['balance', ['solde', 'saldo', 'balance', 'kontostand']],
    ['category', ['categorie', 'kategorie', 'category', 'poste', 'rubrique']],
    [
        'tier',
        ['tier', 'tiers', 'beneficiaire', 'empfanger', 'empfaenger', 'payee', 'contrepartie', 'commercant', 'merchant', 'auftraggeber']
    ],
    [
        'paymentMethod',
        [
            'moyen de paiement',
            'moyen paiement',
            'mode de paiement',
            'type de paiement',
            'carte',
            'numero de carte',
            'zahlungsart',
            'zahlungsmittel',
            'karte',
            'kartennummer',
            'payment method',
            'payment type',
            'card',
            'card number'
        ]
    ]
];

/** Les alias les plus longs d'abord : « date de valeur » gagne sur « date ». Tri stable, comme `OrderByDescending`. */
const ORDERED = ENTRIES.flatMap(([field, aliases]) => aliases.map((alias) => ({ field, alias }))).sort(
    (a, b) => b.alias.length - a.alias.length
);

/** Champ reconnu pour un en-tête (égalité, ou alias suivi d'un espace), ou `null`. */
export function matchHeader(header: string | null | undefined): ImportMappingField | null {
    const normalized = normalizeText(header);
    if (normalized.length === 0) return null;
    for (const { field, alias } of ORDERED) {
        if (
            normalized === alias ||
            (normalized.length > alias.length && normalized.startsWith(alias) && normalized[alias.length] === ' ')
        ) {
            return field;
        }
    }
    return null;
}

/** Champs d'une ligne candidate : la 1re colonne gagne quand plusieurs correspondent au même champ. */
export function matchHeaderRow(row: ImportRow): Map<ImportMappingField, number> {
    const result = new Map<ImportMappingField, number>();
    row.cells.forEach((cell, index) => {
        if (cell === null) return;
        const field = matchHeader(cell);
        if (field && !result.has(field)) result.set(field, index);
    });
    return result;
}

/** Une ligne d'en-tête exploitable porte au moins date + libellé + un montant. */
export function isHeaderCandidate(fields: ReadonlyMap<ImportMappingField, number>): boolean {
    return fields.has('operationDate') && fields.has('label') && (fields.has('amount') || fields.has('debit') || fields.has('credit'));
}
