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
        class="settings-form-page"
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

<style scoped>
/* Maquette 10 : « Annuler » est un bouton secondaire (bordure noire, 700), pas un bouton discret. */
.settings-form-page :deep(.su-hero__actions .su-btn--ghost) {
    border-color: var(--ink);
    color: var(--ink);
    font-weight: 700;
}

/* ── champ de réglages : libellé 13 px au-dessus, note grise dessous (candidat au kit `su-field`) ── */
.settings-form-page :deep(.su-field) {
    min-width: 0;
}

.settings-form-page :deep(.su-field__label) {
    display: block;
    margin: 0 0 8px;
    color: var(--ink);
    font-size: 13px;
    line-height: 1.3;
}

.settings-form-page :deep(.su-field__hint) {
    margin: 6px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

/* Le libellé est déjà au-dessus : pas de légende flottante sur la bordure d’AppSelect. */
.settings-form-page :deep(.su-settings__fields .app-select__legend) {
    display: none;
}

/* ligne interrupteur : libellé 14 px noir + explication grise, filet fin entre les lignes */
.settings-form-page :deep(.su-switch-row) {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    min-width: 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.settings-form-page :deep(.su-switch-row:first-child) {
    border-top: 0;
    padding-top: 0;
}

.settings-form-page :deep(.su-switch-row__text) {
    flex: 1 1 auto;
    min-width: 0;
}

.settings-form-page :deep(.su-switch-row__label) {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.35;
}

.settings-form-page :deep(.su-switch-row__hint) {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.settings-form-page :deep(.su-switch-row .app-switch) {
    flex: none;
}

.settings-form-page :deep(.su-switch-row .app-switch .v-selection-control) {
    min-height: 26px;
}
</style>
