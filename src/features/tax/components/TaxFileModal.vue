<script setup lang="ts">
/** Confirme le dépôt d'une déclaration : date de dépôt, puis verrouillage des montants. */
defineOptions({ name: 'TaxFileModal' });

import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

const open = defineModel<boolean>({ required: true });

defineProps<{
    saving: boolean;
    error: string;
    year: number;
}>();

const emit = defineEmits<{ submit: [submissionDate: string] }>();

const { t } = useI18n();

function today(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const date = ref(today());
const max = ref(today());

watch(open, (isOpen) => {
    if (!isOpen) return;
    date.value = today();
    max.value = today();
});

function submit() {
    if (!date.value || date.value > max.value) return;
    emit('submit', date.value);
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('taxPage.fileModal.title', { year })" :max-width="480" mobile-layout="fullscreen">
        <form id="tax-file-form" class="tax-form tax-form--modal" @submit.prevent="submit">
            <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
            <p class="tax-muted">{{ t('taxPage.fileModal.message') }}</p>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-file-date">{{ t('taxPage.fileModal.date') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-file-date"
                        v-model="date"
                        type="date"
                        :max="max"
                        color="primary"
                        variant="outlined"
                        hide-details
                    />
                </div>
            </div>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                {{ t('taxPage.cancel') }}
            </button>
            <button type="submit" form="tax-file-form" class="su-btn su-btn--ink" :disabled="saving || !date || date > max">
                {{ t('taxPage.fileModal.confirm') }}
            </button>
        </template>
    </AppModalBase>
</template>
