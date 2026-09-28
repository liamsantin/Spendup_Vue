<script setup lang="ts">
/** Actions rapides d’une ligne : trancher un doute, ignorer, réintégrer, corriger. */
import { useI18n } from 'vue-i18n';
import { ArrowBackUpIcon, BanIcon, CheckIcon, PencilIcon } from 'vue-tabler-icons';
import type { ImportLine } from '@/features/imports/types';

defineProps<{
    line: ImportLine;
    acting?: boolean;
}>();

const emit = defineEmits<{
    validate: [line: ImportLine];
    ignore: [line: ImportLine];
    restore: [line: ImportLine];
    edit: [line: ImportLine];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="import-line-actions">
        <button
            v-if="line.status === 'aValider'"
            type="button"
            class="su-orb"
            :disabled="acting"
            :aria-label="t('importsPage.lines.actions.validate')"
            :title="t('importsPage.lines.actions.validate')"
            @click.stop="emit('validate', line)"
        >
            <CheckIcon :size="16" stroke-width="1.8" />
        </button>
        <button
            v-if="line.status === 'ignoree'"
            type="button"
            class="su-orb"
            :disabled="acting"
            :aria-label="t('importsPage.lines.actions.restore')"
            :title="t('importsPage.lines.actions.restore')"
            @click.stop="emit('restore', line)"
        >
            <ArrowBackUpIcon :size="16" stroke-width="1.7" />
        </button>
        <button
            v-else
            type="button"
            class="su-orb"
            :disabled="acting"
            :aria-label="t('importsPage.lines.actions.ignore')"
            :title="t('importsPage.lines.actions.ignore')"
            @click.stop="emit('ignore', line)"
        >
            <BanIcon :size="16" stroke-width="1.7" />
        </button>
        <button
            type="button"
            class="su-orb"
            :disabled="acting"
            :aria-label="t('importsPage.lines.actions.edit')"
            :title="t('importsPage.lines.actions.edit')"
            @click.stop="emit('edit', line)"
        >
            <PencilIcon :size="16" stroke-width="1.6" />
        </button>
    </div>
</template>

<style scoped>
.import-line-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
}
</style>
