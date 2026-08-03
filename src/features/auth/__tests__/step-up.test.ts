import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { ApiError } from '@/features/auth/api';
import { getStepUpChallenge, withStepUpRetry, STEP_UP_REQUIRED_CODE } from '@/features/auth/step-up';
import { useStepUpStore } from '@/features/auth/stores/step-up-store';
import { AppError } from '@/utils/errors/app-error';

describe('step-up', () => {
    beforeEach(() => {
        createTestPinia();
    });

    it('détecte STEP_UP_REQUIRED depuis ApiError', () => {
        const error = new ApiError('Preuve requise', 403, STEP_UP_REQUIRED_CODE, {
            requiresPassword: true,
            requiresOtp: false,
            requiresGoogleIdToken: false,
            acceptedMethods: ['password']
        });

        expect(getStepUpChallenge(error)).toEqual({
            requiresPassword: true,
            requiresOtp: false,
            requiresGoogleIdToken: false,
            acceptedMethods: ['password']
        });
    });

    it('détecte STEP_UP_REQUIRED depuis AppError (fetchWrapper)', () => {
        const error = new AppError('Preuve requise', 403, STEP_UP_REQUIRED_CODE, {
            requiresPassword: false,
            requiresOtp: true,
            requiresGoogleIdToken: false,
            acceptedMethods: ['otp']
        });

        expect(getStepUpChallenge(error)).toEqual({
            requiresPassword: false,
            requiresOtp: true,
            requiresGoogleIdToken: false,
            acceptedMethods: ['otp']
        });
    });

    it('withStepUpRetry relance après AppError STEP_UP_REQUIRED', async () => {
        const execute = vi
            .fn()
            .mockRejectedValueOnce(
                new AppError('Preuve requise', 403, STEP_UP_REQUIRED_CODE, {
                    requiresPassword: true,
                    requiresOtp: false,
                    requiresGoogleIdToken: false,
                    acceptedMethods: ['password']
                })
            )
            .mockResolvedValueOnce('ok');

        const promptPromise = withStepUpRetry(execute);
        await Promise.resolve();
        useStepUpStore().confirm({ password: 'Secret123' });

        await expect(promptPromise).resolves.toBe('ok');
        expect(execute).toHaveBeenCalledTimes(2);
    });

    it('withStepUpRetry relance après preuve', async () => {
        const execute = vi
            .fn()
            .mockRejectedValueOnce(
                new ApiError('Preuve requise', 403, STEP_UP_REQUIRED_CODE, {
                    requiresPassword: true,
                    requiresOtp: false,
                    requiresGoogleIdToken: false,
                    acceptedMethods: ['password']
                })
            )
            .mockResolvedValueOnce('ok');

        const promptPromise = withStepUpRetry(execute);
        await Promise.resolve();

        useStepUpStore().confirm({ password: 'Secret123' });
        await expect(promptPromise).resolves.toBe('ok');
        expect(execute).toHaveBeenCalledTimes(2);
        expect(execute).toHaveBeenLastCalledWith({ password: 'Secret123' });
    });

    it('withStepUpRetry annule si dialogue fermé', async () => {
        const execute = vi.fn().mockRejectedValueOnce(
            new ApiError('Preuve requise', 403, STEP_UP_REQUIRED_CODE, {
                requiresPassword: true,
                requiresOtp: false,
                requiresGoogleIdToken: false,
                acceptedMethods: ['password']
            })
        );

        const promptPromise = withStepUpRetry(execute);
        await Promise.resolve();
        useStepUpStore().cancel();

        await expect(promptPromise).rejects.toMatchObject({ code: 'STEP_UP_CANCELLED' });
        expect(execute).toHaveBeenCalledTimes(1);
    });
});
