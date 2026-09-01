import { describe, expect, it } from 'vitest';
import { formatLastFourDigits, isExpirationStrictlyBeforeTodayUtc, todayUtcYmd } from '@/features/payment-methods/format';

describe('payment-methods format', () => {
    it('masque last4', () => {
        expect(formatLastFourDigits('4242')).toBe('•••• 4242');
        expect(formatLastFourDigits('12')).toBeNull();
        expect(formatLastFourDigits(null)).toBeNull();
    });

    it('compare l’expiration en UTC', () => {
        const now = new Date('2026-09-01T00:00:00.000Z');
        expect(todayUtcYmd(now)).toBe('2026-09-01');
        expect(isExpirationStrictlyBeforeTodayUtc('2026-08-31', now)).toBe(true);
        expect(isExpirationStrictlyBeforeTodayUtc('2026-09-01', now)).toBe(false);
    });
});
