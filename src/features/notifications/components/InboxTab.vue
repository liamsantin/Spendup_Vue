<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
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
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loading && !store.items.length" class="py-8 text-center text-medium-emphasis">
        {{ t('header.notifications.loading') }}
    </div>
    <div v-else-if="!store.items.length" class="py-8 text-center text-medium-emphasis">
        {{ t('header.notifications.empty') }}
    </div>
    <v-list v-else class="py-0" lines="three">
        <v-list-item
            v-for="item in store.items"
            :key="item.id"
            :value="item.id"
            class="px-2 py-3"
            :class="{ 'bg-lightprimary': !item.isRead }"
            rounded="md"
            @click="onItemClick(item)"
        >
            <template #prepend>
                <UserPhotoAvatar class="mr-3" :photo-url="item.photoUrl" :fallback-label="item.title" :size="48" />
            </template>
            <div class="d-flex align-start justify-space-between ga-2">
                <div>
                    <h6 class="text-subtitle-1 font-weight-bold mb-1">{{ item.title }}</h6>
                    <p v-if="item.subtitle || item.message" class="text-body-2 textSecondary mb-1">
                        {{ item.subtitle || item.message }}
                    </p>
                    <p class="text-caption text-medium-emphasis mb-0">{{ formatCreatedAt(item.createdAt) }}</p>
                </div>
                <v-chip v-if="!item.isRead" size="x-small" color="primary" variant="tonal">
                    {{ t('notificationsPage.unread') }}
                </v-chip>
            </div>
        </v-list-item>
    </v-list>

    <div v-if="store.hasMore" class="pt-4 text-center">
        <v-btn variant="text" color="primary" :loading="store.loadingMore" :disabled="store.loadingMore" @click="onLoadMore">
            {{ t('notificationsPage.loadMore') }}
        </v-btn>
    </div>
</template>
