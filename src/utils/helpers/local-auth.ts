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

    const { password: _, ...user } = LOCAL_USER;
    return Promise.resolve(user);
}
