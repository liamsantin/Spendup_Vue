<script setup lang="ts">
/**
 * Transactions liées à un actif : `GET /api/transactions?assetPublicId=`.
 * Créer une écriture depuis ici préremplit le lien.
 */
defineOptions({ name: 'AssetTransactionsPanel' });

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon } from 'vue-tabler-icons';
import TransactionsTimeline from '@/features/transactions/components/TransactionsTimeline.vue';

defineProps<{
    assetPublicId: string;
}>();

const { t } = useI18n();
const timelineRef = ref<{ openCreate: () => void } | null>(null);

function openCreate() {
    timelineRef.value?.openCreate();
}
</script>

<template>
    <div class="asset-transactions">
        <div class="asset-transactions__bar">
            <button type="button" class="su-btn su-btn--ink" @click="openCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </div>
        <TransactionsTimeline ref="timelineRef" :locked-asset-public-id="assetPublicId" />
    </div>
</template>

<style scoped>
.asset-transactions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.asset-transactions__bar {
    display: flex;
    justify-content: flex-end;
}
</style>
