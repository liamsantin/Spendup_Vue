import { computed, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';

/**
 * État commun d’un panneau de sous-liste : modales création / édition, confirmation de suppression,
 * erreur locale (404 neutre + rechargement, 400 tel quel).
 */
export function useRealEstatePanel<T extends { publicId: string }>(options: {
    notFoundKey: string;
    remove: (item: T) => Promise<void>;
    reload: () => Promise<void>;
}) {
    const { t } = useI18n();
    const store = useRealEstateStore();

    const createOpen = ref(false);
    const editTarget = shallowRef<T | null>(null);
    const deleteTarget = shallowRef<T | null>(null);
    const localError = ref<string | null>(null);

    const editOpen = computed({
        get: () => !!editTarget.value,
        set: (value: boolean) => {
            if (!value) editTarget.value = null;
        }
    });

    const deleteOpen = computed({
        get: () => !!deleteTarget.value,
        set: (value: boolean) => {
            if (!value) deleteTarget.value = null;
        }
    });

    const errorText = computed(() => localError.value || store.error);

    function dismissError() {
        localError.value = null;
        store.clearError();
    }

    function openCreate() {
        if (store.acting) return;
        createOpen.value = true;
    }

    function openEdit(item: T) {
        if (store.acting) return;
        editTarget.value = item;
    }

    function requestDelete(item: T) {
        if (store.acting) return;
        deleteTarget.value = item;
    }

    async function confirmDelete() {
        const target = deleteTarget.value;
        if (!target) return;
        localError.value = null;
        try {
            await options.remove(target);
            deleteTarget.value = null;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            store.clearError();
            if (err.status === 404) {
                localError.value = t(options.notFoundKey);
                deleteTarget.value = null;
                void options.reload().catch(() => undefined);
                return;
            }
            localError.value = getErrorMessage(e);
            deleteTarget.value = null;
        }
    }

    async function load(loader: () => Promise<void>) {
        try {
            await loader();
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status !== 404) localError.value = getErrorMessage(e);
            store.clearError();
        }
    }

    return {
        store,
        createOpen,
        editTarget,
        editOpen,
        deleteTarget,
        deleteOpen,
        localError,
        errorText,
        dismissError,
        openCreate,
        openEdit,
        requestDelete,
        confirmDelete,
        load
    };
}
