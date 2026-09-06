<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ShieldCheckIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';

defineProps<{
    enabled: boolean;
    successMessage: string | null;
}>();

const emit = defineEmits<{
    enable: [];
    disable: [];
    dismissSuccess: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppGlassCard :title="t('security.twoFactor.title')" :subtitle="t('security.twoFactor.subtitle')">
        <template #icon>
            <ShieldCheckIcon :size="20" stroke-width="1.5" />
        </template>
        <template #actions>
            <span class="su-chip">{{ enabled ? t('security.twoFactor.status.enabled') : t('security.twoFactor.status.disabled') }}</span>
        </template>
        <AppAlert
            v-if="successMessage"
            type="success"
            closable
            :dismiss-ms="5000"
            class="mt-4"
            @dismiss="emit('dismissSuccess')"
        >
            {{ successMessage }}
        </AppAlert>

        <div class="d-sm-flex justify-space-between align-sm-center mt-2">
            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-5">
                {{ t('security.twoFactor.description') }}
            </div>
            <button v-if="!enabled" type="button" class="su-btn su-btn--ink mt-sm-0 mt-3" @click="emit('enable')">
                {{ t('security.twoFactor.enable') }}
            </button>
            <button v-else type="button" class="su-btn su-btn--danger mt-sm-0 mt-3" @click="emit('disable')">
                {{ t('security.twoFactor.disable') }}
            </button>
        </div>
    </AppGlassCard>
</template>
