<script setup lang="ts">
defineOptions({ name: 'TransactionFilePreviewModal' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import FilePreview from '@/features/files/components/FilePreview.vue';
import type { TransactionFile } from '@/features/transactions/types';

const props = defineProps<{
    modelValue: boolean;
    file: TransactionFile | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const open = computed({
    get: () => props.modelValue && !!props.file,
    set: (value: boolean) => emit('update:modelValue', value)
});
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="file?.nameOriginal || t('filesPage.preview.title')"
        :max-width="920"
        :height="780"
        scrollable
        mobile-layout="fullscreen"
        :show-footer="false"
    >
        <div class="tx-file-preview">
            <FilePreview v-if="file" :public-id="file.publicId" :name-original="file.nameOriginal" />
        </div>
    </AppModalBase>
</template>

<style scoped>
.tx-file-preview {
    display: flex;
    flex-direction: column;
    min-height: 62vh;
    height: 62vh;
}
</style>
