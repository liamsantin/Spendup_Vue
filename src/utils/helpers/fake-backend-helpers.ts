export { fakeBackend };

type FakeUser = {
    id: number;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
};

type FakeFetchOptions = RequestInit & {
    headers: Record<string, string>;
};

type FakeResponse = {
    ok?: boolean;
    status?: number;
    text: () => Promise<string>;
};

function fakeBackend() {
    const users: FakeUser[] = [{ id: 1, username: 'info@wrappixel.com', password: 'admin123', firstName: 'Wrappixel', lastName: '.com' }];
    const realFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const opts = init as FakeFetchOptions;
        return new Promise<Response>((resolve, reject) => {
            setTimeout(handleRoute, 500);

            function handleRoute() {
                switch (true) {
                    case url.endsWith('/users/authenticate') && opts?.method === 'POST':
                        return authenticate();
                    case url.endsWith('/users') && opts?.method === 'GET':
                        return getUsers();
                    default:
                        return realFetch(input, init)
                            .then((response) => resolve(response))
                            .catch((error) => reject(error));
                }
            }

            function authenticate() {
                const { username, password } = body();
                const user = users.find((x) => x.username === username && x.password === password);

                if (!user) return error('Username or password is incorrect');

                return ok({
                    id: user.id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    token: 'fake-jwt-token'
                });
            }

            function getUsers() {
                if (!isAuthenticated()) return unauthorized();
                return ok(users);
            }

            function ok(body: unknown) {
                resolveFake({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) });
            }

            function unauthorized() {
                resolveFake({ status: 401, text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })) });
            }

            function error(message: string) {
                resolveFake({ status: 400, text: () => Promise.resolve(JSON.stringify({ message })) });
            }

            function isAuthenticated() {
                return opts?.headers?.['Authorization'] === 'Bearer fake-jwt-token';
            }

            function body() {
                return opts?.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : {};
            }

            function resolveFake(response: FakeResponse) {
                resolve(response as unknown as Response);
            }
        });
    };
}
