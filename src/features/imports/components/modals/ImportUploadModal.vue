<script setup lang="ts">
/**
 * Choix du compte + fichier (+ modèle et moyen de paiement par défaut optionnels) → `POST /api/imports`.
 * N’écrit aucune transaction : ouvre ensuite l’écran de mapping ou de revue.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CloudUploadIcon, FileSpreadsheetIcon, FileTextIcon, XIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { fileSizeParts } from '@/features/files/format';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { canWriteTransactions } from '@/features/transactions/rights';
import { validateImportFile } from '@/features/imports/format';
import { selectableTemplates } from '@/features/imports/mapping';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import { IMPORT_ACCEPT, type Import, type ImportSourceType } from '@/features/imports/types';

const props = defineProps<{
    modelValue: boolean;
    defaultAccountPublicId?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    created: [item: Import];
}>();

const { t } = useI18n();
const store = useImportsStore();
const accountsStore = useAccountsStore();
const paymentMethodsStore = usePaymentMethodsStore();

const accountPublicId = ref('');
const templatePublicId = ref('');
const paymentMethodPublicId = ref('');
const file = ref<File | null>(null);
const sourceType = ref<ImportSourceType | null>(null);
const fileError = ref<string | null>(null);
const localError = ref<string | null>(null);
const dragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const writableAccounts = computed(() => accountsStore.accounts.filter((account) => canWriteTransactions(account)));
const accountItems = computed(() => writableAccounts.value.map((account) => ({ title: account.name, value: account.publicId })));

const templateItems = computed(() => [
    { title: t('importsPage.upload.autoDetect'), value: '' },
    ...selectableTemplates(store.templates, sourceType.value).map((item) => ({
        title: item.isSystem ? `${item.name} · ${t('importsPage.templates.system')}` : item.name,
        value: item.publicId
    }))
]);

/** Moyens actifs du compte choisi (relevé de carte : tout le fichier est payé avec la même carte). */
const paymentMethodItems = computed(() => [
    { title: t('importsPage.upload.noPaymentMethod'), value: '' },
    ...paymentMethodsStore.items
        .filter((item) => item.accountPublicId === accountPublicId.value && item.isActive)
        .map((item) => ({ title: item.label, value: item.publicId }))
]);

const fileSizeLabel = computed(() => {
    if (!file.value) return '';
    const parts = fileSizeParts(file.value.size);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
});

const canSubmit = computed(() => !!file.value && !fileError.value && !!accountPublicId.value && !store.acting);

function resetForm() {
    const preferred = props.defaultAccountPublicId?.trim();
    const fallback = writableAccounts.value.find((account) => account.isPrimary) ?? writableAccounts.value[0];
    accountPublicId.value = writableAccounts.value.some((account) => account.publicId === preferred)
        ? preferred!
        : (fallback?.publicId ?? '');
    templatePublicId.value = '';
    paymentMethodPublicId.value = '';
    file.value = null;
    sourceType.value = null;
    fileError.value = null;
    localError.value = null;
    dragging.value = false;
}

watch(
    () => props.modelValue,
    async (value) => {
        if (!value) return;
        resetForm();
        await Promise.all([accountsStore.loadAccounts().catch(() => undefined), store.loadTemplates().catch(() => undefined)]);
        if (!accountPublicId.value) resetForm();
        // Même compte qu’à la dernière ouverture : le watch du compte ne se redéclenche pas.
        loadPaymentMethods(accountPublicId.value);
    }
);

function loadPaymentMethods(value: string) {
    if (value) void paymentMethodsStore.loadList({ accountPublicId: value }).catch(() => undefined);
}

watch(accountPublicId, (value) => {
    // Un moyen d’un autre compte → 400 : on le retire au changement de compte.
    paymentMethodPublicId.value = '';
    if (open.value) loadPaymentMethods(value);
});

function fileErrorText(code: string, maxBytes?: number): string {
    if (code === 'tooLarge' && maxBytes) {
        const parts = fileSizeParts(maxBytes);
        return t('importsPage.upload.errors.tooLarge', { max: t(`filesPage.size.${parts.unit}`, { n: parts.n }) });
    }
    return t(`importsPage.upload.errors.${code}`);
}

function pick(next: File | null) {
    localError.value = null;
    const check = validateImportFile(next);
    file.value = next;
    if (!check.ok) {
        sourceType.value = null;
        fileError.value = next ? fileErrorText(check.code, check.maxBytes) : null;
        return;
    }
    fileError.value = null;
    // Un modèle d’un autre type → 400 : on le retire si le format change.
    if (sourceType.value !== check.sourceType) templatePublicId.value = '';
    sourceType.value = check.sourceType;
}

function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    input.value = '';
    pick(selected);
}

function onDrop(event: DragEvent) {
    dragging.value = false;
    const dropped = event.dataTransfer?.files?.[0] ?? null;
    if (dropped) pick(dropped);
}

function clearFile() {
    pick(null);
}

async function onSubmit() {
    if (!canSubmit.value || !file.value) return;
    localError.value = null;
    try {
        const created = await store.uploadImport({
            file: file.value,
            accountPublicId: accountPublicId.value,
            importTemplatePublicId: templatePublicId.value || null,
            paymentMethodPublicId: paymentMethodPublicId.value || null
        });
        emit('created', created);
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('importsPage.upload.title')"
        :subtitle="t('importsPage.upload.subtitle')"
        :max-width="560"
        :height="680"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <AppAlert v-if="!writableAccounts.length && accountsStore.accounts.length" type="info" class="mb-4">
            {{ t('importsPage.upload.noWritableAccount') }}
        </AppAlert>

        <div class="import-upload">
            <AppSelect
                v-model="accountPublicId"
                :items="accountItems"
                :label="t('importsPage.upload.account')"
                :disabled="store.acting || !accountItems.length"
                float-label
                hide-details
            />

            <div
                class="import-upload__drop"
                :class="{ 'is-dragging': dragging, 'has-file': !!file, 'has-error': !!fileError }"
                @dragenter.prevent="dragging = true"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
            >
                <template v-if="file">
                    <span class="import-upload__file-icon">
                        <FileSpreadsheetIcon v-if="sourceType === 'excel'" :size="22" stroke-width="1.6" />
                        <FileTextIcon v-else :size="22" stroke-width="1.6" />
                    </span>
                    <span class="import-upload__file">
                        <span class="import-upload__file-name">{{ file.name }}</span>
                        <span class="import-upload__file-size">{{ fileSizeLabel }}</span>
                    </span>
                    <button
                        type="button"
                        class="su-orb"
                        :disabled="store.acting"
                        :aria-label="t('importsPage.upload.clearFile')"
                        @click="clearFile"
                    >
                        <XIcon :size="16" stroke-width="1.7" />
                    </button>
                </template>
                <button v-else type="button" class="import-upload__pick" :disabled="store.acting" @click="inputRef?.click()">
                    <CloudUploadIcon :size="28" stroke-width="1.5" />
                    <span class="import-upload__pick-title">{{ t('importsPage.upload.pick') }}</span>
                    <span class="import-upload__pick-hint">{{ t('importsPage.upload.formats') }}</span>
                </button>
                <input ref="inputRef" type="file" class="d-none" :accept="IMPORT_ACCEPT" @change="onFileSelected" />
            </div>
            <p v-if="fileError" class="text-caption text-error mt-n2">{{ fileError }}</p>

            <AppSelect
                v-model="templatePublicId"
                :items="templateItems"
                :label="t('importsPage.upload.template')"
                :disabled="store.acting || !sourceType"
                :hint="sourceType ? t('importsPage.upload.templateHint') : t('importsPage.upload.templateNeedsFile')"
                persistent-hint
                float-label
                searchable
                :search-placeholder="t('importsPage.upload.templateSearch')"
            />

            <AppSelect
                v-model="paymentMethodPublicId"
                :items="paymentMethodItems"
                :label="t('importsPage.upload.paymentMethod')"
                :disabled="store.acting || !accountPublicId"
                :hint="t('importsPage.upload.paymentMethodHint')"
                persistent-hint
                float-label
                searchable
                :search-placeholder="t('importsPage.lines.edit.paymentMethodSearch')"
            />

            <ul class="import-upload__notes">
                <li>{{ t('importsPage.upload.notes.noWrite') }}</li>
                <li>{{ t('importsPage.upload.notes.limits') }}</li>
                <li>{{ t('importsPage.upload.notes.transfers') }}</li>
            </ul>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canSubmit" @click="onSubmit">
                <span v-if="store.acting" class="su-spin" />
                {{ t('importsPage.upload.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.import-upload {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.import-upload__drop {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 132px;
    padding: 14px;
    border: 1.5px dashed rgba(16, 16, 20, 0.18);
    border-radius: 18px;
    background: var(--surface-hover-soft, transparent);
    transition:
        border-color 0.2s var(--ease, ease),
        background 0.2s var(--ease, ease);
}

.import-upload__drop.is-dragging {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.06);
}

.import-upload__drop.has-file {
    min-height: 72px;
    border-style: solid;
}

.import-upload__drop.has-error {
    border-color: rgba(var(--v-theme-error), 0.6);
}

.import-upload__pick {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 100px;
    border: 0;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    cursor: pointer;
}

.import-upload__pick:disabled {
    cursor: default;
    opacity: 0.6;
}

.import-upload__pick-title {
    font-size: 0.92rem;
    font-weight: 620;
    color: var(--ink);
}

.import-upload__pick-hint {
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.import-upload__file-icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.import-upload__file {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}

.import-upload__file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
}

.import-upload__file-size {
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.import-upload__notes {
    margin: 0;
    padding-left: 18px;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--ink-muted);
}
</style>
