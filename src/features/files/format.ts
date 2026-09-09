import { matchesSearchTokens } from '@/utils/helpers/text-search';
import { FILE_SEARCH_MAX, type FileDto } from '@/features/files/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const FILE_SORTS = ['recent', 'oldest', 'nameAsc', 'nameDesc', 'sizeDesc'] as const;
export type FileSort = (typeof FILE_SORTS)[number];
export const FILE_SORT_DEFAULT: FileSort = 'recent';

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isFileSort(value: unknown): value is FileSort {
    return typeof value === 'string' && FILE_SORTS.includes(value as FileSort);
}

export function parseFileSort(value: string | null | undefined): FileSort {
    return isFileSort(value) ? value : FILE_SORT_DEFAULT;
}

export function fileSearchHaystack(file: FileDto): string {
    return [file.nameOriginal, file.description ?? '', file.documentDate ?? ''].join(' ');
}

export function matchesFileSearch(file: FileDto, needle: string): boolean {
    const term = needle.trim().slice(0, FILE_SEARCH_MAX);
    if (!term) return true;
    return matchesSearchTokens(fileSearchHaystack(file), term);
}

function createdStamp(file: FileDto): number {
    const time = Date.parse(file.createdAt);
    return Number.isFinite(time) ? time : 0;
}

export function sortFiles(files: FileDto[], sort: FileSort = FILE_SORT_DEFAULT): FileDto[] {
    const copy = [...files];
    copy.sort((a, b) => {
        switch (sort) {
            case 'nameAsc':
            case 'nameDesc': {
                const byName = a.nameOriginal.localeCompare(b.nameOriginal, undefined, { sensitivity: 'base' });
                if (byName !== 0) return sort === 'nameAsc' ? byName : -byName;
                break;
            }
            case 'oldest': {
                const byDate = createdStamp(a) - createdStamp(b);
                if (byDate !== 0) return byDate;
                break;
            }
            case 'sizeDesc': {
                const bySize = b.sizeBytes - a.sizeBytes;
                if (bySize !== 0) return bySize;
                break;
            }
            case 'recent':
            default: {
                const byDate = createdStamp(b) - createdStamp(a);
                if (byDate !== 0) return byDate;
                break;
            }
        }
        return a.publicId.localeCompare(b.publicId);
    });
    return copy;
}

export type FileSizeUnit = 'bytes' | 'kb' | 'mb';

export function fileSizeParts(bytes: number): { unit: FileSizeUnit; n: string } {
    const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    if (safe < 1024) return { unit: 'bytes', n: String(Math.round(safe)) };
    if (safe < 1024 * 1024) return { unit: 'kb', n: formatOneDecimal(safe / 1024) };
    return { unit: 'mb', n: formatOneDecimal(safe / (1024 * 1024)) };
}

function formatOneDecimal(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Date calendaire `YYYY-MM-DD` en local (évite le décalage UTC). */
export function formatDocumentDate(ymd: string, locale: string): string {
    if (!isValidYmd(ymd)) return ymd;
    const [y, m, d] = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(y, m - 1, d));
}

export function formatInstant(iso: string, locale: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
