const LOCAL_USER = {
    id: 1,
    username: 'info@wrappixel.com',
    password: 'admin123',
    firstName: 'Wrappixel',
    lastName: '.com',
    token: 'local-dev-token'
};

export function authenticateLocal(username: string, password: string) {
    if (username !== LOCAL_USER.username || password !== LOCAL_USER.password) {
        return Promise.reject('Username or password is incorrect');
    }

    return Promise.resolve({
        id: LOCAL_USER.id,
        username: LOCAL_USER.username,
        firstName: LOCAL_USER.firstName,
        lastName: LOCAL_USER.lastName,
        token: LOCAL_USER.token
    });
}
