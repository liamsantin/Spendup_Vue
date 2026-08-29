/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_PRICING_PAGE: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    /** Client OAuth Desktop Google (PKCE / Tauri) — audience acceptée côté API. */
    readonly VITE_GOOGLE_DESKTOP_CLIENT_ID: string;
    /** `development` | `production` */
    readonly VITE_APP_ENV: string;
    /** `true` = cookies HttpOnly + CSRF */
    readonly VITE_AUTH_COOKIE_MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare namespace google {
    namespace accounts {
        namespace id {
            function initialize(config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
                auto_select?: boolean;
                cancel_on_tap_outside?: boolean;
            }): void;
            function renderButton(
                parent: HTMLElement,
                options: {
                    theme?: string;
                    size?: string;
                    width?: number;
                    text?: string;
                    shape?: string;
                }
            ): void;
            function prompt(): void;
        }
    }
}
