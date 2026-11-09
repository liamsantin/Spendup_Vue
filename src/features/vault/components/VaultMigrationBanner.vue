<script setup lang="ts">
/**
 * Bandeau discret de migration du Coffre : reprend la migration au montage (clés déjà sur l’appareil
 * après un rechargement) et n’affiche la progression que pour plus d’une dizaine d’éléments.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useVaultStore } from '@/features/vault/stores/vault-store';

/** En dessous, la migration reste invisible. */
const VISIBLE_FROM = 10;

const { t } = useI18n();
const vault = useVaultStore();

const visible = computed(() => vault.migration.running && vault.migration.total > VISIBLE_FROM);
const percent = computed(() =>
    vault.migration.total > 0 ? Math.min(100, Math.round((vault.migration.done / vault.migration.total) * 100)) : 0
);

onMounted(() => {
    vault.startBackgroundMigration();
});
</script>

<template>
    <div v-if="visible" class="vault-migration" role="status" aria-live="polite" data-test="vault-migration-banner">
        <span class="vault-migration__text">{{
            t('vault.migration.progress', { done: vault.migration.done, total: vault.migration.total })
        }}</span>
        <span class="su-gauge vault-migration__gauge" aria-hidden="true">
            <span class="su-gauge__fill" :style="{ width: `${percent}%` }" />
        </span>
    </div>
</template>

<style scoped>
/* Une ligne sur filet 2 px, en bas de l’écran : pas de carte, pas d’ombre. */
.vault-migration {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: var(--bg);
    border-top: 2px solid var(--ink);
    font-size: 13px;
    color: var(--gray);
}

.vault-migration__text {
    font-variant-numeric: tabular-nums;
}

.vault-migration__gauge {
    flex: 1 1 120px;
    max-width: 240px;
}
</style>
