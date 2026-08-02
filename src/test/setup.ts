import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
    /** Les tests ne doivent pas hériter du .env local (cookie mode). */
    vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
});

afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});
