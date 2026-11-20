<script setup lang="ts">
/**
 * Synchro d'un fichier (app de bureau) : l'inclure ou l'exclure, le garder seulement sur cet ordinateur,
 * ou le retélécharger s'il a disparu du dossier.
 */
defineOptions({ name: 'FileSyncModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useFilesStore } from '@/features/files/stores/files-store';
import { useFileSyncStore } from '@/features/files/sync/sync-store';
import type { FileDto } from '@/features/files/types';

const props = defineProps<{ modelValue: boolean; file: FileDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { t } = useI18n();
const store = useFilesStore();
const sync = useFileSyncStore();
const busy = ref(false);
const error = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

watch(open, (value) => {
    if (value) error.value = null;
});

const current = computed(() => (props.file ? (sync.remote.get(props.file.publicId) ?? props.file) : null));
const status = computed(() => (current.value ? sync.statusOf(current.value) : null));
const neverFits = computed(() => sync.plan.blockedNeverFits && sync.plan.blocked?.publicId === current.value?.publicId);

type Action = 'exclude' | 'include' | 'keepHere' | 'restore';

const action = computed<Action | null>(() => {
    switch (status.value) {
        case 'pending':
        case 'local':
            return 'exclude';
        case 'excluded':
            return 'include';
        case 'synced':
        case 'cloud':
            return 'keepHere';
        case 'missing':
            return (current.value?.contentLocation ?? 'online') === 'online' ? 'restore' : null;
        default:
            return null;
    }
});

const message = computed(() => {
    if (!action.value) return t('filesPage.sync.modal.nothing');
    const base = t(`filesPage.sync.modal.${action.value}Body`);
    return neverFits.value ? `${t('filesPage.sync.modal.neverFits')} ${base}` : base;
});

async function onConfirm() {
    const file = current.value;
    if (!file || !action.value) {
        open.value = false;
        return;
    }
    busy.value = true;
    error.value = null;
    try {
        if (action.value === 'exclude') await store.setSyncExcluded(file.publicId, true);
        else if (action.value === 'include') await store.setSyncExcluded(file.publicId, false);
        else if (action.value === 'keepHere') await store.setSyncExcluded(file.publicId, true, true);
        else await sync.restoreMissing(file);
        open.value = false;
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <AppConfirmationModal
        v-model="open"
        :title="action ? t(`filesPage.sync.modal.${action}Title`) : t('filesPage.sync.modal.title')"
        :message="message"
        :confirm-label="action ? t(`filesPage.sync.modal.${action}Confirm`) : t('common.close')"
        :confirm-color="action === 'keepHere' ? 'warning' : 'primary'"
        :loading="busy"
        @confirm="onConfirm"
    >
        <template v-if="error" #header-extra>
            <AppAlert type="error" class="su-alert">{{ error }}</AppAlert>
        </template>
    </AppConfirmationModal>
</template>
