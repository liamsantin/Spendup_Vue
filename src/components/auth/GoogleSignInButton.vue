<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

withDefaults(
    defineProps<{
        label?: string;
    }>(),
    {
        label: 'Sign in with Google'
    }
);

const emit = defineEmits<{
    credential: [idToken: string];
}>();

const container = ref<HTMLElement | null>(null);
const available = ref(false);
const error = ref<string | null>(null);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGisScript(): Promise<void> {
    if (typeof google !== 'undefined' && google.accounts?.id) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.getElementById('google-gis');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
            return;
        }
        const script = document.createElement('script');
        script.id = 'google-gis';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google script'));
        document.head.appendChild(script);
    });
}

async function render() {
    error.value = null;
    available.value = false;
    if (!clientId) {
        return;
    }
    try {
        await loadGisScript();
        if (!container.value) return;
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
            width: 320,
            text: 'continue_with',
            shape: 'rectangular'
        });
        available.value = true;
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    }
}

onMounted(() => {
    void render();
});

watch(
    () => clientId,
    () => {
        void render();
    }
);

onUnmounted(() => {
    if (container.value) {
        container.value.innerHTML = '';
    }
});
</script>

<template>
    <div>
        <div v-if="!clientId" class="text-subtitle-2 text-medium-emphasis mb-2">
            Google Sign-In is not configured (set VITE_GOOGLE_CLIENT_ID).
        </div>
        <div v-show="available" ref="container" class="d-flex justify-center" />
        <v-alert v-if="error" type="warning" density="compact" class="mt-2">{{ error }}</v-alert>
        <span class="d-none">{{ label }}</span>
    </div>
</template>
