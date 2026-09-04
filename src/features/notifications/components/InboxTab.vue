<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { BellIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { resolveNotificationLink, useNotificationsStore } from '@/features/notifications';
import type { AppNotification } from '@/features/notifications';

const { t, locale } = useI18n();
const router = useRouter();
const store = useNotificationsStore();

function formatCreatedAt(iso: string): string {
    try {
        return new Intl.DateTimeFormat(locale.value || undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

onMounted(() => {
    void store.openInbox().catch(() => {
        // store.error
    });
});

async function onItemClick(item: AppNotification) {
    store.dismissLiveFriendChipsByNotificationId(item.id);
    if (!item.isRead) {
        try {
            await store.markRead(item.id);
        } catch {
            // navigation quand même si link
        }
    }
    const target = resolveNotificationLink(item.link, item);
    if (target) {
        await router.push(target);
    }
}

async function onLoadMore() {
    try {
        await store.loadMore();
    } catch {
        // store.error
    }
}
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="su-alert" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loading && !store.items.length" class="su-loading">
        <span class="su-spin" />
    </div>
    <div v-else-if="!store.items.length" class="su-empty">
        <span class="su-empty__mark"><BellIcon :size="24" stroke-width="1.5" /></span>
        {{ t('header.notifications.empty') }}
    </div>
    <div v-else class="su-surface">
        <button
            v-for="(item, i) in store.items"
            :key="item.id"
            type="button"
            class="su-person"
            :class="{ 'is-focused': !item.isRead }"
            :style="{ '--i': i }"
            @click="onItemClick(item)"
        >
            <UserPhotoAvatar :photo-url="item.photoUrl" :fallback-label="item.title" :size="44" />
            <div class="su-person__meta">
                <p class="su-person__name">{{ item.title }}</p>
                <p v-if="item.subtitle || item.message" class="su-person__sub">{{ item.subtitle || item.message }}</p>
                <p class="su-person__sub">{{ formatCreatedAt(item.createdAt) }}</p>
            </div>
            <span v-if="!item.isRead" class="su-chip">{{ t('notificationsPage.unread') }}</span>
        </button>
        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="onLoadMore">
                {{ t('notificationsPage.loadMore') }}
            </button>
        </div>
    </div>
</template>
