import { describe, expect, it } from 'vitest';
import { buildFriendQrPayload, parseFriendQrPayload } from '../qr';

describe('friend qr payload', () => {
    it('buildFriendQrPayload sérialise le publicId', () => {
        expect(buildFriendQrPayload('762H2M3')).toBe('spendup:user:762H2M3');
        expect(buildFriendQrPayload('762h2m3')).toBe('spendup:user:762H2M3');
    });

    it('parseFriendQrPayload accepte le préfixe spendup', () => {
        expect(parseFriendQrPayload('spendup:user:762H2M3')).toBe('762H2M3');
        expect(parseFriendQrPayload('spendup:user:762h2m3')).toBe('762H2M3');
    });

    it('parseFriendQrPayload accepte un publicId brut', () => {
        expect(parseFriendQrPayload('762H2M3')).toBe('762H2M3');
    });

    it('parseFriendQrPayload rejette les valeurs invalides', () => {
        expect(parseFriendQrPayload('')).toBeNull();
        expect(parseFriendQrPayload('https://example.com')).toBeNull();
        expect(parseFriendQrPayload('spendup:user:SHORT')).toBeNull();
        expect(parseFriendQrPayload('spendup:user:762H2M!')).toBeNull();
    });
});
