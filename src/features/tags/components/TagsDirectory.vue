<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { matchesTagSearch } from '@/features/tags/format';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import type { Tag } from '@/features/tags/types';
import TagListItem from '@/features/tags/components/list/TagListItem.vue';
import TagFormModal from '@/features/tags/components/modals/TagFormModal.vue';

const props = defineProps<{
    search?: string | null;
}>();

const { t } = useI18n();
const store = useTagsStore();

const createOpen = ref(false);
const editTarget = ref<Tag | null>(null);
const deleteTarget = ref<Tag | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

const visibleItems = computed(() => {
    const needle = props.search?.trim() ?? '';
    if (!needle) return store.items;
    return store.items.filter((tag) => matchesTagSearch(tag, needle));
});

const deleteMessage = computed(() => {
    const tag = deleteTarget.value;
    if (!tag) return t('tagsPage.deleteModal.body');
    const parts: string[] = [];
    if (tag.transactionCount) {
        parts.push(t('tagsPage.list.transactions', { count: tag.transactionCount }, tag.transactionCount));
    }
    if (tag.recurringExpenseCount) {
        parts.push(t('tagsPage.list.recurringExpenses', { count: tag.recurringExpenseCount }, tag.recurringExpenseCount));
    }
    if (!parts.length) return t('tagsPage.deleteModal.body');
    return t('tagsPage.deleteModal.bodyUsed', {
        usage: parts.join(t('tagsPage.deleteModal.join'))
    });
});

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({ force });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

function openCreate() {
    createOpen.value = true;
}

function openEdit(tag: Tag) {
    editTarget.value = tag;
}

function requestDelete(tag: Tag) {
    deleteTarget.value = tag;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteTag(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('tagsPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

defineExpose({ openCreate });
</script>

<template>
    <div>
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
        <div v-else-if="!visibleItems.length" class="su-empty">
            <p>{{ props.search?.trim() ? t('tagsPage.empty.filtered') : t('tagsPage.empty.list') }}</p>
        </div>
        <div v-else class="tags-directory__list">
            <TagListItem
                v-for="tag in visibleItems"
                :key="tag.publicId"
                :tag="tag"
                :acting="store.acting"
                @edit="openEdit"
                @delete="requestDelete"
            />
        </div>

        <TagFormModal v-model="createOpen" />
        <TagFormModal v-model="editOpen" :tag="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('tagsPage.deleteModal.title')"
            :message="deleteMessage"
            :confirm-label="t('tagsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.tags-directory__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
}
</style>
