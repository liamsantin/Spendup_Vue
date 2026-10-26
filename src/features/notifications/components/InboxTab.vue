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

/** Date courte « 23.10 » ; l’heure reste dans l’attribut `title`. */
function formatCreatedAt(iso: string): string {
    try {
        return new Intl.DateTimeFormat(locale.value || undefined, { day: '2-digit', month: '2-digit' }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function formatCreatedAtFull(iso: string): string {
    try {
        return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
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
    <AppAlert v-if="store.error" type="error" class="su-alert" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loading && !store.items.length" class="su-loading">
        <span class="su-spin" />
    </div>
    <div v-else-if="!store.items.length" class="su-empty">
        <span class="su-empty__mark"><BellIcon :size="24" stroke-width="1.5" /></span>
        {{ t('header.notifications.empty') }}
    </div>
    <!-- Lignes `su-person` : non lu = titre 700 + carré bleu 6 px, lu = 400 gris ; date courte grise à droite. -->
    <div v-else class="su-surface inbox-list">
        <button
            v-for="(item, i) in store.items"
            :key="item.id"
            type="button"
            class="su-person inbox-item"
            :class="{ 'is-unread': !item.isRead }"
            :style="{ '--i': i }"
            @click="onItemClick(item)"
        >
            <UserPhotoAvatar :photo-url="item.photoUrl" :fallback-label="item.title" :size="36" />
            <div class="su-person__meta">
                <p class="su-person__name inbox-item__title">
                    {{ item.title }}
                    <span v-if="!item.isRead" class="inbox-item__dot" aria-hidden="true" />
                </p>
                <p v-if="item.subtitle || item.message" class="su-person__sub">{{ item.subtitle || item.message }}</p>
            </div>
            <span class="inbox-item__date" :title="formatCreatedAtFull(item.createdAt)">{{ formatCreatedAt(item.createdAt) }}</span>
            <span v-if="!item.isRead" class="d-sr-only">{{ t('notificationsPage.unread') }}</span>
        </button>
        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="onLoadMore">
                {{ t('notificationsPage.loadMore') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.inbox-list {
    display: flex;
    flex-direction: column;
}

/* lu : titre en 400 gris foncé ; non lu : 700 noir */
.inbox-item .inbox-item__title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-mute);
    font-weight: 400;
}

.inbox-item.is-unread .inbox-item__title {
    color: var(--ink);
    font-weight: 700;
}

.inbox-item__dot {
    display: inline-block;
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

.inbox-item__date {
    flex: none;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}
</style>
