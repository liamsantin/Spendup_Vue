<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { IMPORTS_PATHS, ImportWorkspace, importDetailPath, isImportLineStatus, useImportsStore } from '@/features/imports';
import type { ImportLineStatus } from '@/features/imports';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useImportsStore();

const layout = ref<'board' | 'scroll'>('scroll');

const publicId = computed(() => {
    const raw = route.params.publicId;
    return typeof raw === 'string' ? raw.trim() : '';
});

const item = computed(() => (store.current?.publicId === publicId.value ? store.current : null));
const loadError = ref<string | null>(null);

const title = computed(() => item.value?.fileName ?? t('importsPage.detail.title'));

const lineStatus = computed<ImportLineStatus | null>(() => {
    const raw = route.query.status;
    return typeof raw === 'string' && isImportLineStatus(raw) ? raw : null;
});

const lineTabs = computed(() => {
    const counts = item.value?.counts;
    if (!counts) return [];
    return [
        { value: null, label: t('importsPage.lineTabs.all'), count: counts.total },
        { value: 'aValider' as const, label: t('importsPage.lineTabs.aValider'), count: counts.toReview },
        { value: 'erreur' as const, label: t('importsPage.lineTabs.erreur'), count: counts.errors },
        { value: 'ignoree' as const, label: t('importsPage.lineTabs.ignoree'), count: counts.ignored }
    ];
});

function selectLineStatus(value: ImportLineStatus | null) {
    const query = { ...route.query };
    if (value) query.status = value;
    else delete query.status;
    void router.replace({ path: importDetailPath(publicId.value), query });
}

async function load() {
    if (!publicId.value) return;
    loadError.value = null;
    try {
        await store.openImport(publicId.value);
    } catch (e: unknown) {
        if (!store.currentGone) loadError.value = store.toAppError(e).message;
    }
}

/** L’expiration (30 jours) et les autres appareils sans SignalR : relire au retour sur l’onglet. */
function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !item.value) return;
    void load();
}

watch(publicId, () => void load());

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void load();
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    store.closeImport();
});

function onDeleted() {
    void router.replace(IMPORTS_PATHS.list);
}
</script>

<template>
    <AppPageShell class="import-detail-page" :class="{ 'is-board': layout === 'board' && !!item }" :title="title" :body-scroll="false">
        <template #actions>
            <RouterLink :to="IMPORTS_PATHS.list" class="su-btn su-btn--ghost import-detail-page__back">
                <ArrowLeftIcon :size="16" stroke-width="1.7" />
                {{ t('importsPage.detail.back') }}
            </RouterLink>
        </template>

        <template v-if="item && item.status === 'aValider' && layout === 'board'" #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('importsPage.lineTabs.label')">
                <button
                    v-for="tab in lineTabs"
                    :key="tab.value ?? 'all'"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': lineStatus === tab.value }"
                    @click="selectLineStatus(tab.value)"
                >
                    {{ tab.label }}
                    <span v-if="tab.count" class="su-tab__chip">{{ tab.count }}</span>
                </button>
            </nav>
        </template>

        <div v-if="store.currentGone" class="su-empty">
            <p>{{ t('importsPage.detail.gone') }}</p>
            <RouterLink :to="IMPORTS_PATHS.list" class="su-btn su-btn--ink import-detail-page__back">{{
                t('importsPage.detail.back')
            }}</RouterLink>
        </div>
        <AppAlert v-else-if="loadError && !item" type="error" class="su-alert">{{ loadError }}</AppAlert>
        <div v-else-if="!item" class="su-loading">
            <span class="su-spin" />
        </div>
        <ImportWorkspace v-else :item="item" @deleted="onDeleted" @layout="layout = $event" />
    </AppPageShell>
</template>

<style scoped>
.import-detail-page__back {
    text-decoration: none;
}

/* Revue : même plateau plein écran que les pages liste (règle AppBoard sur `.su-body > .app-board`). */
.import-detail-page.is-board :deep(.su-body) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    padding-top: 8px;
}

@media (max-width: 767px) {
    .import-detail-page.is-board :deep(.su-body) {
        padding: 0;
    }
}
</style>
