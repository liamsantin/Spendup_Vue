import type { Me } from '@/features/auth/types';

export const DEMO_USER_PUBLIC_ID = 'DEMO001';

export function demoMe(): Me {
    return {
        userPublicId: DEMO_USER_PUBLIC_ID,
        email: 'camille@demo.spendup.ch',
        username: 'camille',
        firstName: 'Camille',
        name: 'Démo',
        emailVerified: true,
        twoFactorEnabled: false,
        pendingEmail: null,
        phone: null,
        birthDate: null,
        street: null,
        streetNumber: null,
        countryId: null,
        profilePicture: null,
        hasPassword: false,
        hasGoogle: false
    };
}
