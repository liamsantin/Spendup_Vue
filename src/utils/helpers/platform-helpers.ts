import { isTauri as tauriIsTauri } from '@tauri-apps/api/core';

/** Détection shell desktop Tauri (WebView). */
export function isTauri(): boolean {
    try {
        return tauriIsTauri();
    } catch {
        return false;
    }
}
