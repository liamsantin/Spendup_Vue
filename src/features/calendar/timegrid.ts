/**
 * Grille horaire des vues Semaine et Jour : partage d'un jour entre bandeau « journée entière » et blocs horaires,
 * et placement côte à côte des blocs qui se chevauchent. Les minutes sont celles de l'horloge locale (0 à 1440).
 */
import { addDaysYmd, occurrenceDays, parseYmd } from '@/features/calendar/dates';
import type { CalendarOccurrence } from '@/features/calendar/types';

export const DAY_MINUTES = 1440;
/** Pas de la création au clic sur un créneau. */
export const SLOT_MINUTES = 30;
/** Hauteur minimale d'un bloc : un événement court reste lisible et compte comme tel dans les chevauchements. */
export const MIN_BLOCK_MINUTES = 20;

export type TimedBlock = {
    occurrence: CalendarOccurrence;
    startMin: number;
    endMin: number;
    /** Colonne du bloc dans son groupe de chevauchements, à partir de 0. */
    column: number;
    /** Nombre de colonnes du groupe. */
    columns: number;
};

export type DayLayout = {
    /** Journées entières, occurrences sans heure et horaires sur plusieurs jours. */
    allDay: CalendarOccurrence[];
    timed: TimedBlock[];
};

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function wallMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

/** `HH:mm` d'une minute du jour (bornée à 23:59). */
export function minutesToHhmm(minutes: number): string {
    const clamped = Math.min(Math.max(Math.round(minutes), 0), DAY_MINUTES - 1);
    return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** Début du créneau qui contient `minutes`. */
export function snapToSlot(minutes: number, slot = SLOT_MINUTES): number {
    return Math.min(Math.max(Math.floor(minutes / slot) * slot, 0), DAY_MINUTES - slot);
}

/** Répartit les occurrences d'un jour (déjà filtrées sur ce jour) entre bandeau et grille. */
export function layoutDay(items: readonly CalendarOccurrence[], ymd: string): DayLayout {
    const dayStart = parseYmd(ymd).getTime();
    const nextStart = parseYmd(addDaysYmd(ymd, 1)).getTime();
    const allDay: CalendarOccurrence[] = [];
    const segments: { occurrence: CalendarOccurrence; startMin: number; endMin: number }[] = [];

    for (const occurrence of items) {
        if (occurrence.isFullDay || !occurrence.startUtc || occurrenceDays(occurrence).length > 1) {
            allDay.push(occurrence);
            continue;
        }
        const start = Date.parse(occurrence.startUtc);
        const end = occurrence.endUtc ? Date.parse(occurrence.endUtc) : start;
        const startMin = start <= dayStart ? 0 : wallMinutes(new Date(start));
        const endMin = end >= nextStart ? DAY_MINUTES : Math.max(wallMinutes(new Date(end)), startMin);
        segments.push({ occurrence, startMin, endMin });
    }

    segments.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.occurrence.title.localeCompare(b.occurrence.title));

    // Groupes de blocs qui se chevauchent de proche en proche ; chaque bloc prend la première colonne libre.
    const timed: TimedBlock[] = [];
    let group: TimedBlock[] = [];
    let columnEnds: number[] = [];
    let groupEnd = -1;
    const closeGroup = () => {
        for (const block of group) block.columns = columnEnds.length;
        group = [];
        columnEnds = [];
    };
    for (const segment of segments) {
        const visualEnd = Math.max(segment.endMin, segment.startMin + MIN_BLOCK_MINUTES);
        if (segment.startMin >= groupEnd) closeGroup();
        let column = columnEnds.findIndex((end) => end <= segment.startMin);
        if (column === -1) {
            column = columnEnds.length;
            columnEnds.push(visualEnd);
        } else {
            columnEnds[column] = visualEnd;
        }
        const block: TimedBlock = { ...segment, column, columns: 1 };
        group.push(block);
        timed.push(block);
        groupEnd = Math.max(groupEnd, visualEnd);
    }
    closeGroup();

    return { allDay, timed };
}
