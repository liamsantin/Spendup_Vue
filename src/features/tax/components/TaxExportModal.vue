<script setup lang="ts">
/** Choix d'un export : récapitulatif PDF, justificatifs (ZIP), tableur (CSV) ou données (JSON). */
defineOptions({ name: 'TaxExportModal' });

import { useI18n } from 'vue-i18n';
import { CodeIcon, FileTextIcon, FileZipIcon, TableExportIcon } from 'vue-tabler-icons';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

export type TaxExportKind = 'pdf' | 'bundle' | 'csv' | 'json';

const open = defineModel<boolean>({ required: true });

defineProps<{
    saving: boolean;
    year: number;
}>();

const emit = defineEmits<{ choose: [kind: TaxExportKind] }>();

const { t } = useI18n();

const CHOICES: { kind: TaxExportKind; icon: typeof FileTextIcon }[] = [
    { kind: 'pdf', icon: FileTextIcon },
    { kind: 'bundle', icon: FileZipIcon },
    { kind: 'csv', icon: TableExportIcon },
    { kind: 'json', icon: CodeIcon }
];
</script>

<template>
    <AppModalBase v-model="open" :title="t('taxPage.exportModal.title', { year })" :max-width="520" mobile-layout="fullscreen">
        <div class="tax-export">
            <button
                v-for="choice in CHOICES"
                :key="choice.kind"
                type="button"
                class="tax-export__choice"
                :disabled="saving"
                @click="emit('choose', choice.kind)"
            >
                <span class="su-menu-item__icon"><component :is="choice.icon" :size="20" stroke-width="1.6" /></span>
                <span class="tax-export__text">
                    <span class="tax-export__title">{{ t(`taxPage.exportModal.${choice.kind}.title`) }}</span>
                    <span class="tax-export__detail">{{ t(`taxPage.exportModal.${choice.kind}.detail`) }}</span>
                </span>
            </button>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                {{ t('taxPage.cancel') }}
            </button>
        </template>
    </AppModalBase>
</template>
