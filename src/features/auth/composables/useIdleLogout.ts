import { onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useUserSettingsStore } from '@/features/user-settings';
import { IDLE_LOGOUT_MINUTES_MAX, IDLE_LOGOUT_MINUTES_MIN } from '@/features/user-settings/types';

/**
 * Interactions « volontaires » uniquement.
 * Pas de `mousemove` / `wheel` : trop sensibles, le timer ne finissait jamais.
 */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'] as const;

/**
 * Déconnexion UX locale selon `idleLogoutMinutes` (settings API).
 * `null` = désactivé. L’API applique aussi l’idle (refresh / JWT) — ce timer reste pour la réactivité.
 */
export function useIdleLogout() {
    const auth = useAuthStore();
    const settingsStore = useUserSettingsStore();
    const { isAuthenticated } = storeToRefs(auth);
    const { current } = storeToRefs(settingsStore);
    const { t } = useI18n();

    let timer: ReturnType<typeof setTimeout> | null = null;
    let armed = false;

    function clearTimer() {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function idleMinutes(): number | null {
        const minutes = current.value.idleLogoutMinutes;
        if (minutes == null || minutes < IDLE_LOGOUT_MINUTES_MIN) return null;
        return Math.min(minutes, IDLE_LOGOUT_MINUTES_MAX);
    }

    function schedule() {
        clearTimer();
        if (!isAuthenticated.value) return;
        const minutes = idleMinutes();
        if (minutes == null) return;
        timer = setTimeout(() => {
            void auth.forceReLogin(t('security.session.idleLogoutNotice'));
        }, minutes * 60_000);
    }

    function onActivity() {
        if (!armed) return;
        schedule();
    }

    function arm() {
        if (armed) return;
        armed = true;
        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, onActivity, { passive: true });
        }
        schedule();
    }

    function disarm() {
        armed = false;
        clearTimer();
        for (const event of ACTIVITY_EVENTS) {
            window.removeEventListener(event, onActivity);
        }
    }

    function sync() {
        if (isAuthenticated.value && idleMinutes() != null) {
            arm();
            schedule();
        } else {
            disarm();
        }
    }

    onMounted(() => {
        void settingsStore.ensureLoaded().finally(sync);
    });
    onUnmounted(disarm);

    watch(
        () => [isAuthenticated.value, current.value.idleLogoutMinutes] as const,
        () => sync()
    );
}
