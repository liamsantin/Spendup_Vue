import { ApiError } from './api';

/** Message API idle logout (`IdleSessionGuard`). */
const IDLE_MESSAGE_RE = /inactivit[eé]|inactivity/i;

/** Détecte une révocation session pour inactivité (refresh ou JWT). */
export function isIdleSessionError(error: unknown): boolean {
    if (error instanceof ApiError) {
        return error.status === 401 && IDLE_MESSAGE_RE.test(error.message);
    }
    if (error instanceof Error) {
        return IDLE_MESSAGE_RE.test(error.message);
    }
    if (typeof error === 'string') {
        return IDLE_MESSAGE_RE.test(error);
    }
    return false;
}

export function isIdleSessionMessage(message: string | null | undefined): boolean {
    return !!message && IDLE_MESSAGE_RE.test(message);
}
