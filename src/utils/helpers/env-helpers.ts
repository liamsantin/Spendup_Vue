/** `VITE_APP_ENV` : `development` active les outils / pages réservés au développement. */
export function isDevAppEnv(): boolean {
    return (
        String(import.meta.env.VITE_APP_ENV ?? '')
            .trim()
            .toLowerCase() === 'development'
    );
}
