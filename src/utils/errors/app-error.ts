import { ApiError } from '@/features/auth/api';

/**
 * Erreur applicative normalisée (HTTP / métier).
 * Préférer cette forme à des `reject(string)` pour garder status + message.
 */
export class AppError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status = 0, code?: string) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
    }

    static fromUnknown(error: unknown, fallback = 'Une erreur est survenue.'): AppError {
        if (error instanceof AppError) return error;
        if (error instanceof ApiError) return new AppError(error.message, error.status);
        if (error instanceof Error) return new AppError(error.message || fallback);
        if (typeof error === 'string' && error.trim()) return new AppError(error);
        return new AppError(fallback);
    }
}

export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
    return AppError.fromUnknown(error, fallback).message;
}

/** Dépaquete une enveloppe `{ success, message, result }` Spendup. */
export function unwrapSpendupEnvelope<T = unknown>(data: unknown, statusText = 'Request failed'): T {
    if (data && typeof data === 'object' && 'success' in data) {
        const envelope = data as { success: boolean; message?: string; result?: T };
        if (!envelope.success) {
            throw new AppError(envelope.message ?? statusText);
        }
        return envelope.result as T;
    }
    return data as T;
}
