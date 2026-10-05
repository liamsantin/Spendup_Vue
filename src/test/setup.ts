import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
    /** Les tests Bearer ne doivent pas hériter d’un cookie-mode local. */
    vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
});

afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});
