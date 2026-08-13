<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import { isGoogleDesktopConfigured, requestGoogleIdTokenDesktop } from '@/features/auth/google-desktop-oauth';
import { isTauri } from '@/utils/helpers/platform-helpers';

const props = defineProps<{
    label?: string;
}>();

const { t } = useI18n();
const displayLabel = computed(() => props.label || t('auth.google.signIn'));

const emit = defineEmits<{
    credential: [idToken: string];
}>();

const root = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
const desktopBusy = ref(false);

const useDesktopFlow = isTauri();
const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const configured = computed(() => (useDesktopFlow ? isGoogleDesktopConfigured() : Boolean(webClientId)));

let resizeObserver: ResizeObserver | null = null;

/** Chargeur GIS partagé (évite des listeners `load` empilés à chaque mount). */
let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
    if (typeof google !== 'undefined' && google.accounts?.id) {
        return Promise.resolve();
    }
    if (gisScriptPromise) return gisScriptPromise;

    gisScriptPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById('google-gis') as HTMLScriptElement | null;
        if (existing) {
            if (typeof google !== 'undefined' && google.accounts?.id) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(t('auth.google.scriptFailed'))), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.id = 'google-gis';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
            gisScriptPromise = null;
            reject(new Error(t('auth.google.scriptFailed')));
        };
        document.head.appendChild(script);
    });

    return gisScriptPromise;
}

function buttonWidth(): number {
    const w = root.value?.clientWidth ?? 0;
    return Math.max(Math.round(w), 240);
}

async function renderGis() {
    error.value = null;
    if (!webClientId) return;
    try {
        await loadGisScript();
        await nextTick();
        if (!container.value || !root.value) return;

        container.value.innerHTML = '';
        google.accounts.id.initialize({
            client_id: webClientId,
            callback: (response) => {
                if (response.credential) {
                    emit('credential', response.credential);
                }
            }
        });

        google.accounts.id.renderButton(container.value, {
            theme: 'outline',
            size: 'large',
            width: buttonWidth(),
            text: 'continue_with',
            shape: 'rectangular'
        });
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    }
}

async function onDesktopClick() {
    if (desktopBusy.value) return;
    error.value = null;
    desktopBusy.value = true;
    try {
        const idToken = await requestGoogleIdTokenDesktop();
        emit('credential', idToken);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (/timed out/i.test(message)) {
            error.value = t('auth.google.desktopTimeout');
        } else if (/already in progress/i.test(message)) {
            error.value = t('auth.google.desktopInProgress');
        } else {
            error.value = import.meta.env.DEV ? `${t('auth.google.desktopFailed')} (${message})` : t('auth.google.desktopFailed');
        }
    } finally {
        desktopBusy.value = false;
    }
}

onMounted(() => {
    if (useDesktopFlow) return;
    void renderGis();
    if (root.value && typeof ResizeObserver !== 'undefined') {
        let lastWidth = root.value.clientWidth;
        resizeObserver = new ResizeObserver(() => {
            const next = root.value?.clientWidth ?? 0;
            if (Math.abs(next - lastWidth) < 2) return;
            lastWidth = next;
            void renderGis();
        });
        resizeObserver.observe(root.value);
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (container.value) {
        container.value.innerHTML = '';
    }
});
</script>

<template>
    <div ref="root" class="google-signin">
        <div v-if="!configured" class="text-subtitle-2 text-medium-emphasis mb-2">
            {{ useDesktopFlow ? t('auth.google.desktopNotConfigured') : t('auth.google.notConfigured') }}
        </div>
        <template v-else-if="useDesktopFlow">
            <v-btn
                block
                size="large"
                variant="outlined"
                color="primary"
                class="text-none"
                :loading="desktopBusy"
                :disabled="desktopBusy"
                @click="onDesktopClick"
            >
                {{ displayLabel }}
            </v-btn>
        </template>
        <div v-else ref="container" class="google-signin__btn" />
        <AppAlert v-if="error" type="warning" class="mt-2">{{ error }}</AppAlert>
        <span v-if="!useDesktopFlow" class="d-none">{{ displayLabel }}</span>
    </div>
</template>
