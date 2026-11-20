<script setup lang="ts">
/**
 * Onglet « Justificatifs » d’une fiche : bouton « Ajouter » en haut à droite (envoi d’un PDF ou choix dans la
 * bibliothèque), puis la liste des PDF liés, avec ouverture et retrait. `source` dit où lire et écrire.
 * Le slot par défaut ajoute des blocs sous la liste (ex. PDF des transactions liées) ; `title` nomme alors le premier.
 */
defineOptions({ name: 'EntityAttachmentsPanel' });

import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import type { AttachmentSource } from '@/features/attachments/api';
import { isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import { useFilesStore } from '@/features/files/stores/files-store';
import type { FileDto } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';
import AttachmentActions from '@/features/transactions/components/forms/AttachmentActions.vue';
import TransactionAttachments from '@/features/transactions/components/forms/TransactionAttachments.vue';
import TransactionFilePreviewModal from '@/features/transactions/components/modals/TransactionFilePreviewModal.vue';
import type { TransactionFile } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        source: AttachmentSource;
        /** Titre du bloc des pièces liées, utile quand le slot ajoute d’autres blocs. */
        title?: string;
        canEdit?: boolean;
    }>(),
    {
        title: undefined,
        canEdit: true
    }
);

const { t } = useI18n();
const filesStore = useFilesStore();

const files = ref<TransactionFile[]>([]);
const loading = ref(false);
const uploading = ref(false);
const acting = ref(false);
const localError = ref<string | null>(null);
const previewFile = ref<TransactionFile | null>(null);
const previewOpen = ref(false);
/** Numéro du chargement en cours : un chargement dépassé (autre élément) n’écrase pas la liste. */
let loadId = 0;

async function load() {
    const id = ++loadId;
    loading.value = true;
    localError.value = null;
    // la bibliothèque et le quota servent au bouton « Ajouter » ; un échec n’empêche pas l’affichage
    void filesStore.loadList().catch(() => undefined);
    void filesStore.loadUsage().catch(() => undefined);
    try {
        const result = await props.source.list();
        if (id === loadId) files.value = result.items ?? [];
    } catch (e: unknown) {
        if (id === loadId) localError.value = getErrorMessage(e);
    } finally {
        if (id === loadId) loading.value = false;
    }
}

async function attach(filePublicId: string) {
    const result = await props.source.attach(filePublicId);
    files.value = result.items ?? [];
}

async function onUpload(file: File) {
    const valid = await validatePdfFile(file);
    if (!valid.ok) {
        localError.value = t(`filesPage.errors.${valid.code}`);
        return;
    }
    if (filesStore.usage && wouldExceedQuota(filesStore.usage, file.size)) {
        localError.value = t('filesPage.errors.quotaExceeded');
        return;
    }
    uploading.value = true;
    localError.value = null;
    try {
        const uploaded = await filesStore.uploadFile(file);
        await attach(uploaded.publicId);
    } catch (e: unknown) {
        localError.value = isQuotaExceededMessage(getErrorMessage(e)) ? t('filesPage.errors.quotaExceeded') : getErrorMessage(e);
    } finally {
        uploading.value = false;
    }
}

async function onPick(file: FileDto) {
    acting.value = true;
    localError.value = null;
    try {
        await attach(file.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

/** Plusieurs fichiers choisis : liés l’un après l’autre, la liste suit la dernière réponse. */
async function onPickMany(picked: FileDto[]) {
    acting.value = true;
    localError.value = null;
    try {
        for (const file of picked) await attach(file.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

async function onDetach(file: TransactionFile) {
    acting.value = true;
    localError.value = null;
    try {
        await props.source.detach(file.publicId);
        files.value = files.value.filter((item) => item.publicId !== file.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

function openFile(file: TransactionFile) {
    previewFile.value = file;
    previewOpen.value = true;
}

watch(() => props.source.key, load, { immediate: true });

defineExpose({ reload: load, openFile });
</script>

<template>
    <div class="entity-attachments">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link entity-attachments__retry" @click="load">{{ t('common.retry') }}</button>
        </AppAlert>

        <!-- barre d’actions en haut à droite, comme les autres onglets d’une fiche -->
        <AttachmentActions
            v-if="canEdit"
            class="entity-attachments__bar"
            menu
            :attached="files"
            :library="filesStore.items"
            :uploading="uploading"
            :acting="acting"
            :max="source.max"
            @upload="onUpload"
            @pick="onPick"
            @pick-many="onPickMany"
        />

        <!-- avec un bloc en slot : deux cadres carrés côte à côte (empilés sur mobile) ; sinon la liste seule -->
        <div class="entity-attachments__grid" :class="{ 'entity-attachments__grid--pair': !!$slots.default }">
            <section class="entity-attachments__block">
                <h2 v-if="title" class="entity-attachments__title">{{ title }}</h2>
                <div v-if="loading && !files.length" class="su-loading"><span class="su-spin" /></div>
                <TransactionAttachments
                    v-else
                    :files="files"
                    :library="filesStore.items"
                    :can-edit="canEdit"
                    hide-actions
                    :max="source.max"
                    :uploading="uploading"
                    :acting="acting"
                    @detach="onDetach"
                    @open="openFile"
                />
            </section>

            <slot :open-file="openFile" />
        </div>

        <TransactionFilePreviewModal v-model="previewOpen" :file="previewFile" />
    </div>
</template>

<style scoped>
.entity-attachments {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap, 56px);
    min-width: 0;
}

/* la barre colle au premier bloc : même écart que dans l’onglet Transactions */
.entity-attachments__bar {
    margin-bottom: calc(16px - var(--section-gap, 56px));
}

.entity-attachments__grid {
    min-width: 0;
}

/* deux cadres de même largeur et de même hauteur, filet fin, sans arrondi ni ombre */
.entity-attachments__grid--pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 32px;
}

.entity-attachments__grid--pair > .entity-attachments__block,
.entity-attachments__grid--pair > :slotted(.entity-attachments__block) {
    min-width: 0;
    padding: 24px;
    border: 1px solid var(--line);
}

@media (max-width: 959px) {
    .entity-attachments__grid--pair {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
    }

    .entity-attachments__grid--pair > .entity-attachments__block,
    .entity-attachments__grid--pair > :slotted(.entity-attachments__block) {
        padding: 16px;
    }
}

/* titre de bloc : 16 px 700 sur filet 2 px, comme les sections d’une fiche */
.entity-attachments__title,
.entity-attachments :slotted(.entity-attachments__title) {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--ink);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.entity-attachments__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}
</style>
