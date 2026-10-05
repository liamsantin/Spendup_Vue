<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { useDirtyPageGuard } from '@/features/user-settings/composables/useDirtyPageGuard';

const props = defineProps<{
    title: string;
    subtitle?: string;
    icon?: unknown;
    dirty: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    save: [];
    cancel: [];
    discard: [];
}>();

const { t } = useI18n();
const { leaveConfirmOpen, onLeaveOpenChange, confirmLeave } = useDirtyPageGuard(
    () => props.dirty,
    () => emit('discard')
);

const saveDisabled = computed(() => !!props.loading || !props.dirty);
const cancelDisabled = computed(() => !!props.loading || !props.dirty);
</script>

<template>
    <AppPageShell
        :title="title"
        :subtitle="subtitle"
        :icon="icon"
        :hide-actions="false"
        :save-disabled="saveDisabled"
        :cancel-disabled="cancelDisabled"
        :save-loading="!!loading"
        @save="emit('save')"
        @cancel="emit('cancel')"
    >
        <slot />
    </AppPageShell>

    <AppConfirmationModal
        :model-value="leaveConfirmOpen"
        :title="t('accounts.leaveDirtyModal.title')"
        :message="t('accounts.leaveDirtyModal.body')"
        :confirm-label="t('accounts.leaveDirtyModal.confirm')"
        confirm-color="error"
        @update:model-value="onLeaveOpenChange"
        @confirm="confirmLeave"
    />
</template>
