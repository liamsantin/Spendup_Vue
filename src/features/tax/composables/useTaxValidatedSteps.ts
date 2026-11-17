import { ref } from 'vue';
import { migrateValidatedSteps } from '@/features/tax/steps';

const validatedKey = (id: string) => `spendup.tax.validated.${id}`;

/**
 * Étapes validées d'une déclaration, gardées sur l'appareil (localStorage).
 * `currentId` donne la déclaration ouverte au moment d'écrire.
 */
export function useTaxValidatedSteps(currentId: () => string | null | undefined) {
    const validated = ref<string[]>([]);

    function load(id: string) {
        try {
            const raw = localStorage.getItem(validatedKey(id));
            const parsed = raw ? (JSON.parse(raw) as unknown) : [];
            validated.value = Array.isArray(parsed)
                ? migrateValidatedSteps(parsed.filter((item): item is string => typeof item === 'string'))
                : [];
        } catch {
            validated.value = [];
        }
    }

    function reset() {
        validated.value = [];
    }

    function persist() {
        const id = currentId();
        if (!id) return;
        localStorage.setItem(validatedKey(id), JSON.stringify(validated.value));
    }

    function isDone(id: string): boolean {
        return validated.value.includes(id);
    }

    function remember(id: string) {
        if (!validated.value.includes(id)) validated.value = [...validated.value, id];
        persist();
    }

    function forget(id: string) {
        if (!validated.value.includes(id)) return;
        validated.value = validated.value.filter((item) => item !== id);
        persist();
    }

    return { validated, load, reset, isDone, remember, forget };
}
