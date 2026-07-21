<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

withDefaults(
    defineProps<{
        label?: string;
    }>(),
    {
        label: 'Se connecter avec Google'
    }
);

const emit = defineEmits<{
    credential: [idToken: string];
}>();

const root = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let resizeObserver: ResizeObserver | null = null;

function loadGisScript(): Promise<void> {
    if (typeof google !== 'undefined' && google.accounts?.id) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.getElementById('google-gis');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Échec du chargement du script Google')));
            return;
        }
        const script = document.createElement('script');
        script.id = 'google-gis';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Échec du chargement du script Google'));
        document.head.appendChild(script);
    });
}

function buttonWidth(): number {
    const w = root.value?.clientWidth ?? 0;
    return Math.max(Math.round(w), 240);
}

async function render() {
    error.value = null;
    if (!clientId) {
        return;
    }
    try {
        await loadGisScript();
        await nextTick();
        if (!container.value || !root.value) return;

        container.value.innerHTML = '';
        google.accounts.id.initialize({
            client_id: clientId,
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

onMounted(() => {
    void render();
    if (root.value && typeof ResizeObserver !== 'undefined') {
        let lastWidth = root.value.clientWidth;
        resizeObserver = new ResizeObserver(() => {
            const next = root.value?.clientWidth ?? 0;
            if (Math.abs(next - lastWidth) < 2) return;
            lastWidth = next;
            void render();
        });
        resizeObserver.observe(root.value);
    }
});

watch(
    () => clientId,
    () => {
        void render();
    }
);

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
        <div v-if="!clientId" class="text-subtitle-2 text-medium-emphasis mb-2">
            Connexion Google non configurée (définir VITE_GOOGLE_CLIENT_ID).
        </div>
        <div v-else ref="container" class="google-signin__btn" />
        <v-alert v-if="error" type="warning" density="compact" class="mt-2">{{ error }}</v-alert>
        <span class="d-none">{{ label }}</span>
    </div>
</template>
