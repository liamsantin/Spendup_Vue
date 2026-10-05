import { onUnmounted, ref, watch } from 'vue';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Champ de recherche lié à l’URL : saisie locale immédiate, écriture dans la query après un délai.
 * `read` renvoie la valeur actuelle de la query, `commit` l’écrit (`undefined` pour la retirer).
 */
export function useBoardSearch(options: { read: () => string; commit: (value: string | undefined) => void; max: number }) {
    const input = ref(options.read().slice(0, options.max));
    let timer: ReturnType<typeof setTimeout> | null = null;

    function stopTimer() {
        if (timer) clearTimeout(timer);
        timer = null;
    }

    function onInput(value: string) {
        input.value = value.slice(0, options.max);
        stopTimer();
        timer = setTimeout(() => {
            timer = null;
            options.commit(input.value.trim() || undefined);
        }, SEARCH_DEBOUNCE_MS);
    }

    function clear() {
        stopTimer();
        input.value = '';
        options.commit(undefined);
    }

    watch(options.read, (value) => {
        if (timer) return;
        const next = value.slice(0, options.max);
        if (next !== input.value.trim() && next !== input.value) input.value = next;
    });

    onUnmounted(stopTimer);

    return { input, onInput, clear };
}
