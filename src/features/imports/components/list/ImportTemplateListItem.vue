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
    <div
        class="import-template-row"
        :class="{ 'is-system': template.isSystem, 'is-inactive': !template.isActive }"
        :data-template-id="template.publicId"
        @click="onActivate"
    >
        <span class="import-template-row__icon">
            <FileSpreadsheetIcon v-if="template.sourceType === 'excel'" :size="18" stroke-width="1.7" />
            <FileTextIcon v-else :size="18" stroke-width="1.7" />
        </span>
        <div class="import-template-row__meta">
            <p class="import-template-row__name">
                {{ template.name }}
                <span v-if="!template.isActive" class="import-template-row__flag">{{ t('importsPage.templates.inactive') }}</span>
            </p>
            <p class="import-template-row__sub">{{ subtitle }}</p>
        </div>
        <div class="import-template-row__actions">
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
.import-template-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-width: 0;
    min-height: 56px;
    padding: 8px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.import-template-row.is-system {
    cursor: default;
}

.import-template-row:hover {
    background: var(--surface-hover-soft);
}

.import-template-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.import-template-row.is-inactive .import-template-row__icon,
.import-template-row.is-inactive .import-template-row__name {
    opacity: 0.55;
}

.import-template-row__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.import-template-row__name,
.import-template-row__sub {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-template-row__name {
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
}

.import-template-row__flag {
    margin-left: 6px;
    font-size: 0.72rem;
    font-weight: 560;
    color: var(--ink-muted);
}

.import-template-row__sub {
    margin-top: 2px;
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.import-template-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 4px;
}

.import-template-row__lock {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    color: var(--ink-muted);
}
</style>
