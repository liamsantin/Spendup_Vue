<script setup lang="ts">
/** Pastille de statut d’un import ou d’une ligne (couleur par statut, libellé traduit). */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ImportLineStatus, ImportStatus } from '@/features/imports/types';

const props = defineProps<{
    status: ImportStatus | ImportLineStatus;
    kind: 'import' | 'line';
}>();

const { t } = useI18n();

const label = computed(() =>
    t(props.kind === 'import' ? `importsPage.statuses.${props.status}` : `importsPage.lineStatuses.${props.status}`)
);

/** `erreur` d’un import = étape de mapping, pas un échec : ton « à faire », pas rouge. */
const tone = computed(() => {
    if (props.kind === 'import') {
        if (props.status === 'valide') return 'success';
        if (props.status === 'annule') return 'muted';
        return 'warning';
    }
    if (props.status === 'validee') return 'success';
    if (props.status === 'aValider') return 'warning';
    if (props.status === 'erreur') return 'error';
    return 'muted';
});
</script>

<template>
    <span class="import-status-chip" :class="`is-${tone}`">
        <span class="import-status-chip__label">{{ label }}</span>
    </span>
</template>

<style scoped>
.import-status-chip {
    --tint: rgb(var(--v-theme-primary));
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 24px;
    padding: 0 10px 0 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: var(--tint);
    font-size: 0.72rem;
    font-weight: 620;
    white-space: nowrap;
}

.import-status-chip::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.import-status-chip__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.import-status-chip.is-success {
    --tint: rgb(var(--v-theme-success));
}

.import-status-chip.is-warning {
    --tint: rgb(var(--v-theme-warning));
}

.import-status-chip.is-error {
    --tint: rgb(var(--v-theme-error));
}

.import-status-chip.is-muted {
    --tint: var(--ink-muted);
}
</style>
