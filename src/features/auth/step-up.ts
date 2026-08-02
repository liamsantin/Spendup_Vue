import { ApiError } from '@/features/auth/api';
import { AppError } from '@/utils/errors/app-error';
import type { StepUpProof, StepUpRequiredDetails } from '@/features/auth/types';
import { useStepUpStore } from '@/features/auth/stores/step-up-store';

export const STEP_UP_REQUIRED_CODE = 'STEP_UP_REQUIRED';

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function parseStepUpDetails(raw: unknown): StepUpRequiredDetails | null {
    const source = asRecord(raw);
    if (!source) return null;
    return {
        requiresPassword: source.requiresPassword === true,
        requiresOtp: source.requiresOtp === true,
        requiresGoogleIdToken: source.requiresGoogleIdToken === true,
        acceptedMethods: Array.isArray(source.acceptedMethods)
            ? source.acceptedMethods.filter((item): item is string => typeof item === 'string')
            : []
    };
}

export function getStepUpChallenge(error: unknown): StepUpRequiredDetails | null {
    if (error instanceof ApiError && error.code === STEP_UP_REQUIRED_CODE) {
        return parseStepUpDetails(error.details);
    }
    if (error instanceof AppError && error.code === STEP_UP_REQUIRED_CODE) {
        return parseStepUpDetails(error.details);
    }
    return null;
}

export function isStepUpRequired(error: unknown): boolean {
    return getStepUpChallenge(error) != null;
}

/**
 * Exécute l’action ; si l’API renvoie `STEP_UP_REQUIRED`, ouvre le dialogue
 * puis relance une fois avec la preuve.
 */
export async function withStepUpRetry<T>(execute: (stepUp?: StepUpProof) => Promise<T>): Promise<T> {
    try {
        return await execute(undefined);
    } catch (error) {
        const challenge = getStepUpChallenge(error);
        if (!challenge) throw error;

        const proof = await useStepUpStore().prompt(challenge);
        if (!proof) {
            throw new ApiError('Action annulée.', 0, 'STEP_UP_CANCELLED');
        }
        return await execute(proof);
    }
}
