import { useAuthStore } from '@/features/auth';

type RequestOptions = {
    method: string;
    headers: Record<string, string>;
    body?: string;
};

let refreshInFlight: Promise<boolean> | null = null;

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE')
};

function apiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function request(method: string) {
    return async (url: string, body?: unknown) => {
        const doFetch = async (retried: boolean): Promise<unknown> => {
            const requestOptions: RequestOptions = {
                method,
                headers: authHeader(url)
            };
            if (body !== undefined) {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = JSON.stringify(body);
            }

            const response = await fetch(url, requestOptions);
            return handleResponse(response, () => {
                if (retried) return Promise.reject('Unauthorized');
                return doFetch(true);
            });
        };

        return doFetch(false);
    };
}

function authHeader(url: string): Record<string, string> {
    const auth = useAuthStore();
    const isLoggedIn = !!auth.accessToken;
    const isApiUrl = url.startsWith(apiBaseUrl());
    if (isLoggedIn && isApiUrl && auth.accessToken) {
        return { Authorization: `Bearer ${auth.accessToken}` };
    }
    return {};
}

async function tryRefreshOnce(): Promise<boolean> {
    if (!refreshInFlight) {
        const auth = useAuthStore();
        refreshInFlight = auth.refreshSession().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

async function handleResponse(response: Response, retry: () => Promise<unknown>) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (response.status === 401) {
        const auth = useAuthStore();
        if (auth.refreshToken) {
            const refreshed = await tryRefreshOnce();
            if (refreshed) {
                return retry();
            }
        }
        if (auth.isAuthenticated) {
            auth.clearSession();
            await auth.forceReLogin();
        }
        const error = (data && data.message) || response.statusText;
        return Promise.reject(error);
    }

    if (!response.ok) {
        const error = (data && data.message) || response.statusText;
        return Promise.reject(error);
    }

    // Spendup envelope when present
    if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
            return Promise.reject(data.message ?? 'Request failed');
        }
        return data.result;
    }

    return data;
}
