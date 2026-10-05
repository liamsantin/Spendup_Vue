<script setup lang="ts">
/**
 * Zone dangereuse du compte — CTA suppression (émet `delete` vers le parent / modal).
 */
import { useI18n } from 'vue-i18n';
import { TrashIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';

defineEmits<{
    delete: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppGlassCard danger :title="t('accounts.danger.title')" :subtitle="t('accounts.danger.subtitle')">
        <template #icon>
            <TrashIcon :size="20" stroke-width="1.5" />
        </template>
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
            <p class="text-subtitle-1 text-medium-emphasis mb-0 pr-4">{{ t('accounts.danger.warning') }}</p>
            <button type="button" class="su-btn su-btn--danger flex-shrink-0" @click="$emit('delete')">
                {{ t('accounts.danger.deleteAccount') }}
            </button>
        </div>
    </AppGlassCard>
</template>
