/**
 * Relevé d'exemple de la démo, fabriqué dans l'onglet (aucun téléchargement depuis le site).
 * Ses libellés rejoignent le foyer de démo : un alias reconnaît le tiers (Migros), l'historique
 * suggère une catégorie (Restaurant, CFF), et deux cafés identiques montrent un doublon.
 */
import { localYmd } from '@/features/demo/db';

type SampleRow = { daysAgo: number; label: string; amount: number };

const ROWS: readonly SampleRow[] = [
    { daysAgo: 18, label: 'MIGROS LAUSANNE', amount: -64.35 },
    { daysAgo: 16, label: 'CFF', amount: -38.0 },
    { daysAgo: 14, label: 'Restaurant', amount: -52.8 },
    { daysAgo: 12, label: 'Swisscom Mobile', amount: -59.9 },
    { daysAgo: 10, label: 'Remboursement Camille', amount: 45.0 },
    { daysAgo: 9, label: 'Pharmacie du Marché', amount: -23.4 },
    { daysAgo: 7, label: 'Café de la Gare', amount: -4.8 },
    { daysAgo: 7, label: 'Café de la Gare', amount: -4.8 },
    { daysAgo: 5, label: 'MIGROS LAUSANNE', amount: -41.15 },
    { daysAgo: 3, label: 'Librairie Payot', amount: -32.0 },
    { daysAgo: 2, label: 'Coop Pronto', amount: -12.6 }
];

const OPENING_BALANCE = 3200;

function dmy(date: Date): string {
    const [year, month, day] = localYmd(date).split('-');
    return `${day}.${month}.${year}`;
}

/** Texte CSV du relevé d'exemple (`;`, dates `dd.MM.yyyy`, solde après chaque opération). */
export function demoSampleStatementText(today: Date = new Date()): string {
    let balance = OPENING_BALANCE;
    const lines = ['Relevé de compte — exemple Spend.Up', '', 'Date;Libellé;Montant;Solde'];
    for (const row of ROWS) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - row.daysAgo);
        balance = Math.round((balance + row.amount) * 100) / 100;
        lines.push(`${dmy(date)};${row.label};${row.amount.toFixed(2)};${balance.toFixed(2)}`);
    }
    return lines.join('\r\n') + '\r\n';
}

/** Le relevé d'exemple comme fichier choisi par le visiteur. */
export function demoSampleStatementFile(fileName: string, today: Date = new Date()): File {
    return new File(['﻿' + demoSampleStatementText(today)], fileName, { type: 'text/csv' });
}

/** Propose le relevé d'exemple à l'enregistrement, sans quitter l'onglet ni contacter le site. */
export function downloadDemoSampleStatement(fileName: string): void {
    const url = URL.createObjectURL(demoSampleStatementFile(fileName));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
