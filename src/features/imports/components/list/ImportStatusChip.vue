<script setup lang="ts">
/** Statut d’un import ou d’une ligne : petit carré de couleur + libellé gris (pas de pilule). */
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

/** `erreur` d’un import = étape de mapping, pas un échec : ton « à faire » (violet), pas rouge. */
const tone = computed(() => {
    if (props.kind === 'import') {
        if (props.status === 'valide') return 'done';
        if (props.status === 'annule') return 'muted';
        return 'todo';
    }
    if (props.status === 'validee') return 'done';
    if (props.status === 'aValider') return 'todo';
    if (props.status === 'erreur') return 'error';
    return 'muted';
});
</script>

<template>
    <span class="su-chip import-status-chip" :class="`is-${tone}`">
        <span class="import-status-chip__label">{{ label }}</span>
    </span>
</template>

<style scoped>
/* fait = bleu (donnée clé), à traiter = violet (alerte), erreur = rouge, ignoré = gris */
.import-status-chip {
    max-width: 100%;
    white-space: nowrap;
}

.import-status-chip__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.import-status-chip.is-done {
    --chip-color: var(--blue);
}

.import-status-chip.is-todo {
    --chip-color: var(--violet);
}

.import-status-chip.is-error {
    --chip-color: var(--danger);
}

.import-status-chip.is-muted {
    --chip-color: var(--gray);
}
</style>
