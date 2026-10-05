<script setup lang="ts">
/** Historique des imports (du plus récent au plus ancien), filtré par statut / compte. */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import ImportListItem from '@/features/imports/components/list/ImportListItem.vue';
import { importDetailPath } from '@/features/imports/paths';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import type { Import, ImportStatus } from '@/features/imports/types';

const props = defineProps<{
    status?: ImportStatus | null;
    accountPublicId?: string | null;
}>();

const { t } = useI18n();
const router = useRouter();
const store = useImportsStore();

const deleteTarget = ref<Import | null>(null);
const localError = ref<string | null>(null);

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

const filtered = computed(() => !!props.status || !!props.accountPublicId);

async function loadDirectory() {
    localError.value = null;
    try {
        await store.loadList({ status: props.status ?? null, accountPublicId: props.accountPublicId ?? null });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

/** Retour d’onglet : l’expiration automatique (30 jours) ne pousse aucun événement. */
function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory();
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory();
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [props.status, props.accountPublicId] as const,
    () => {
        void loadDirectory();
    }
);

function openImport(item: Import) {
    void router.push(importDetailPath(item.publicId));
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteImport(target.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        deleteTarget.value = null;
    }
}
</script>

<template>
    <div class="imports-directory">
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.items.length" class="su-empty">
            <p>{{ filtered ? t('importsPage.empty.filtered') : t('importsPage.empty.list') }}</p>
        </div>
        <div v-else class="imports-directory__list">
            <ImportListItem
                v-for="item in store.items"
                :key="item.publicId"
                :item="item"
                :acting="store.acting"
                @open="openImport"
                @delete="deleteTarget = $event"
            />
        </div>

        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('importsPage.loadMore') }}
            </button>
        </div>

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('importsPage.deleteModal.title')"
            :message="t('importsPage.deleteModal.body')"
            :confirm-label="t('importsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.imports-directory__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
}
</style>
