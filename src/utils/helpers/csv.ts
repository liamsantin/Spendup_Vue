/** Export CSV (séparateur `;`, BOM UTF-8) : s’ouvre directement dans Excel FR. */

export type CsvValue = string | number | null | undefined;

export function csvCell(value: CsvValue): string {
    const text = value == null ? '' : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
    return [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export function downloadCsv(baseName: string, header: readonly string[], rows: readonly (readonly CsvValue[])[]): void {
    const url = URL.createObjectURL(new Blob(['\uFEFF', buildCsv(header, rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
