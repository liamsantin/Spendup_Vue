import { useAuthStore } from '@/app/stores/auth-store';

type RequestOptions = {
    method: string;
    headers: Record<string, string>;
    body?: string;
};

type AuthUser = {
    token?: string;
};

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE')
};

function request(method: string) {
    return (url: string, body?: unknown) => {
        const requestOptions: RequestOptions = {
            method,
            headers: authHeader(url)
        };
        if (body) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(body);
        }
        return fetch(url, requestOptions).then(handleResponse);
    };
}

function authHeader(url: string): Record<string, string> {
    const { user } = useAuthStore();
    const authUser = user as AuthUser | null;
    const isLoggedIn = !!authUser?.token;
    const isApiUrl = url.startsWith(import.meta.env.VITE_API_URL);
    if (isLoggedIn && isApiUrl && authUser?.token) {
        return { Authorization: `Bearer ${authUser.token}` };
    }

    return {};
}

function handleResponse(response: Response) {
    return response.text().then((text: string) => {
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            const { user, logout } = useAuthStore();
            if ([401, 403].includes(response.status) && user) {
                logout();
            }

            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}
