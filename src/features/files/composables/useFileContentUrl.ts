import { onUnmounted, ref, shallowRef } from 'vue';
import { loadReadablePdf } from '@/features/files/content';
import { getErrorMessage } from '@/utils/errors/app-error';

/**
 * Charge un PDF via `GET /content` (Bearer), le déchiffre si le Coffre l’a chiffré, et expose une blob URL.
 * Révoque l’URL au unmount — ne pas persister.
 */
export function useFileContentUrl() {
    const objectUrl = ref<string | null>(null);
    /** PDF déchiffré, pour un lecteur qui lit les octets plutôt que l’URL (la CSP bloque fetch sur blob:). */
    const blob = shallowRef<Blob | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    let requestId = 0;

    function revoke() {
        if (objectUrl.value) {
            URL.revokeObjectURL(objectUrl.value);
            objectUrl.value = null;
        }
        blob.value = null;
    }

    async function load(publicId: string) {
        const id = ++requestId;
        error.value = null;
        loading.value = true;
        revoke();
        try {
            const pdf = await loadReadablePdf(publicId);
            if (id !== requestId) return;
            blob.value = pdf;
            objectUrl.value = URL.createObjectURL(pdf);
        } catch (e: unknown) {
            if (id !== requestId) return;
            error.value = getErrorMessage(e);
        } finally {
            if (id === requestId) loading.value = false;
        }
    }

    function reset() {
        requestId += 1;
        loading.value = false;
        error.value = null;
        revoke();
    }

    onUnmounted(() => {
        requestId += 1;
        revoke();
    });

    return { objectUrl, blob, loading, error, load, reset, revoke };
}

export async function downloadFileBlob(publicId: string, nameOriginal: string) {
    const blob = await loadReadablePdf(publicId);
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = nameOriginal || 'document.pdf';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        URL.revokeObjectURL(url);
    }
}
