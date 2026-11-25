import type { InjectionKey } from 'vue';
import type { CalendarOccurrence } from '@/features/calendar/types';

/** Fourni par la vue : lance le règlement d'une échéance récurrente depuis une ligne du calendrier. */
export const CALENDAR_PAY_KEY: InjectionKey<(occurrence: CalendarOccurrence) => void> = Symbol('calendarPay');
