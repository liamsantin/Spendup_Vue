<script setup lang="ts">
/** Fenêtre d'import d'une déclaration existante (PDF lu sur l'appareil). */
defineOptions({ name: 'TaxImportModal' });

import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UploadIcon } from 'vue-tabler-icons';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { useCantonItems } from '@/features/tax/cantons';

export interface TaxImportPayload {
    /** `null` si aucun fichier n'est choisi : à signaler à la personne. */
    file: File | null;
    year: number;
    canton: string;
    name: string | null;
}

const open = defineModel<boolean>({ required: true });

const props = defineProps<{
    saving: boolean;
    error: string;
    defaultCanton: string;
}>();

const emit = defineEmits<{ submit: [payload: TaxImportPayload] }>();

const { t } = useI18n();
const cantonItems = useCantonItems();

const year = ref(new Date().getFullYear());
const canton = ref(props.defaultCanton);
const name = ref('');
const file = ref<File | null>(null);
const fileLabel = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

// Chaque ouverture repart d'un formulaire neuf.
watch(open, (isOpen) => {
    if (!isOpen) return;
    year.value = new Date().getFullYear();
    canton.value = props.defaultCanton;
    name.value = '';
    file.value = null;
    fileLabel.value = '';
});

function onFile(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
        file.value = null;
        fileLabel.value = '';
        return;
    }
    file.value = input.files[0];
    fileLabel.value = input.files[0].name;
}

function submit() {
    emit('submit', { file: file.value, year: year.value, canton: canton.value, name: name.value.trim() || null });
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('taxPage.importExisting')" :max-width="560" scrollable mobile-layout="fullscreen">
        <form id="tax-import-form" class="tax-form tax-form--modal" @submit.prevent="submit">
            <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-name">{{ t('taxPage.name') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-import-name"
                        v-model="name"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="80"
                        :placeholder="t('taxPage.namePlaceholder')"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-year">{{ t('taxPage.year') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-import-year"
                        v-model.number="year"
                        type="number"
                        min="2000"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-canton">{{ t('taxPage.canton') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-import-canton"
                        v-model="canton"
                        :items="cantonItems"
                        :label="t('taxPage.canton')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-file">{{ t('taxPage.importFile') }}</label>
                <div class="tax-form__field">
                    <input ref="inputRef" class="tax-import-file" type="file" accept="application/pdf,.pdf" @change="onFile" />
                    <button id="tax-import-file" type="button" class="su-btn" :disabled="saving" @click="inputRef?.click()">
                        <UploadIcon :size="16" stroke-width="1.6" />
                        {{ fileLabel || t('taxPage.chooseFile') }}
                    </button>
                </div>
            </div>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                {{ t('taxPage.cancel') }}
            </button>
            <button type="submit" form="tax-import-form" class="su-btn su-btn--ink" :disabled="saving">
                {{ t('taxPage.import') }}
            </button>
        </template>
    </AppModalBase>
</template>
