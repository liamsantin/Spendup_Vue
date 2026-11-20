<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileSpreadsheetIcon, FileTextIcon, LockIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import type { ImportTemplate } from '@/features/imports/types';

const props = defineProps<{
    template: ImportTemplate;
    bankName?: string | null;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [template: ImportTemplate];
    delete: [template: ImportTemplate];
    toggleActive: [template: ImportTemplate, value: boolean];
}>();

const { t } = useI18n();

const subtitle = computed(() => {
    const parts = [t(`importsPage.sourceTypes.${props.template.sourceType}`)];
    if (props.template.isSystem && props.template.description) parts.push(props.template.description);
    if (!props.template.isSystem && props.bankName) parts.push(props.bankName);
    if (props.template.mapping?.invertSign) parts.push(t('importsPage.templates.invertedSign'));
    return parts.join(' · ');
});

function onActivate(event: MouseEvent) {
    if (props.template.isSystem || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, input, .v-switch')) return;
    emit('edit', props.template);
}
</script>

<template>
    <!-- Ligne su-person : carré 36 px teinté, nom 700 (+ « Inactif » en gris), sous-ligne grise, actions à droite. -->
    <div
        class="su-person import-template-row"
        :class="{ 'is-system': template.isSystem, 'is-inactive': !template.isActive }"
        :data-template-id="template.publicId"
        @click="onActivate"
    >
        <span
            class="su-person__avatar su-person__avatar--tile"
            :class="template.sourceType === 'excel' ? 'su-tile--green' : 'su-tile--blue'"
        >
            <FileSpreadsheetIcon v-if="template.sourceType === 'excel'" :size="18" stroke-width="1.7" />
            <FileTextIcon v-else :size="18" stroke-width="1.7" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">
                {{ template.name }}
                <span v-if="!template.isActive" class="import-template-row__flag">{{ t('importsPage.templates.inactive') }}</span>
            </p>
            <p class="su-person__sub">{{ subtitle }}</p>
        </div>
        <div class="su-person__actions import-template-row__actions">
            <template v-if="template.isSystem">
                <span class="import-template-row__lock" :title="t('importsPage.templates.systemReadOnly')">
                    <LockIcon :size="16" stroke-width="1.6" />
                </span>
            </template>
            <template v-else>
                <AppSwitch
                    :model-value="template.isActive"
                    :disabled="acting"
                    :aria-label="t('importsPage.templateForm.fields.active')"
                    @update:model-value="emit('toggleActive', template, !!$event)"
                />
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('importsPage.actions.editTemplate')"
                    @click.stop="emit('edit', template)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('importsPage.actions.deleteTemplate')"
                    @click.stop="emit('delete', template)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </template>
        </div>
    </div>
</template>

<style scoped>
.import-template-row.is-system {
    cursor: default;
}

.import-template-row.is-inactive .su-person__avatar,
.import-template-row.is-inactive .su-person__name {
    opacity: 0.55;
}

.import-template-row__flag {
    margin-left: 8px;
    font-size: 13px;
    font-weight: 400;
    color: var(--gray);
}

.import-template-row__actions {
    flex-wrap: nowrap;
    gap: 8px;
}

.import-template-row__lock {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    color: var(--gray);
}
</style>
