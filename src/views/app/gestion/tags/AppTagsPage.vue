<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { TAG_NAME_MAX, TagsDirectory, useTagsStore } from '@/features/tags';
import { matchesTagSearch } from '@/features/tags/format';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTagsStore();
const directoryRef = ref<{ openCreate: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((tag) => matchesTagSearch(tag, needle)).length;
});

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    if (q) next.q = q.slice(0, TAG_NAME_MAX);
    void router.replace({ path: '/app/gestion/tags', query: next });
}

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: TAG_NAME_MAX
});

function onCreate() {
    if (store.acting) return;
    directoryRef.value?.openCreate();
}
</script>

<template>
    <AppPageShell class="tags-page" :title="t('tagsPage.title')" :subtitle="t('tagsPage.subtitle')" :body-scroll="false">
        <AppBoard>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="TAG_NAME_MAX"
                    :placeholder="t('tagsPage.searchPlaceholder')"
                    :search-label="t('tagsPage.actions.search')"
                    :clear-label="t('tagsPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="store.initialized && visibleCount" class="su-toolbar__count app-board__count">
                    {{ t('tagsPage.count', { count: visibleCount }, visibleCount) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="store.acting"
                    :aria-label="t('tagsPage.actions.create')"
                    @click="onCreate"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('tagsPage.actions.create') }}</span>
                </button>
            </template>
            <TagsDirectory ref="directoryRef" :search="queryString('q')" />
        </AppBoard>
    </AppPageShell>
</template>
