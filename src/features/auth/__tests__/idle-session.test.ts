import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { isIdleSessionError, isIdleSessionMessage } from './idle-session';

describe('idle-session', () => {
    it('détecte le message API français', () => {
        expect(isIdleSessionMessage('Session expirée pour inactivité.')).toBe(true);
        expect(isIdleSessionError(new ApiError('Session expirée pour inactivité.', 401))).toBe(true);
    });

    it('détecte inactivity EN', () => {
        expect(isIdleSessionMessage('Session expired due to inactivity')).toBe(true);
    });

    it('ignore les 401 classiques', () => {
        expect(isIdleSessionError(new ApiError('Unauthorized', 401))).toBe(false);
        expect(isIdleSessionMessage('Invalid refresh token')).toBe(false);
    });
});
