<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { BellIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import { resolveNotificationLink, useNotificationsStore } from '@/features/notifications';
import type { AppNotification } from '@/features/notifications';

const { t, locale } = useI18n();
const router = useRouter();
const store = useNotificationsStore();

const unreadLabel = computed(() => t('notificationsPage.unreadCount', { count: store.unreadCount }));

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
    if (!item.isRead) {
        try {
            await store.markRead(item.id);
        } catch {
            // navigation quand même si link
        }
    }
    const target = resolveNotificationLink(item.link);
    if (target) {
        await router.push(target);
    }
}

async function onMarkAllRead() {
    try {
        await store.markAllRead();
    } catch {
        // store.error
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
    <v-row justify="center">
        <v-col cols="12" md="9">
            <v-card elevation="10">
                <v-card-item>
                    <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                        <div class="d-sm-flex align-center gap-3">
                            <v-avatar class="bg-lightprimary text-primary" rounded="md" size="48">
                                <BellIcon size="24" />
                            </v-avatar>
                            <div class="mt-4 mt-sm-0">
                                <h4 class="text-h4 mb-0">{{ t('notificationsPage.title') }}</h4>
                                <div class="text-subtitle-1 textSecondary mt-1">
                                    {{ t('notificationsPage.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <div class="d-flex align-center ga-2">
                            <v-chip v-if="store.hasUnread" color="primary" variant="flat" size="small" class="text-white">
                                {{ unreadLabel }}
                            </v-chip>
                            <v-btn
                                color="primary"
                                variant="outlined"
                                :loading="store.markingAll"
                                :disabled="!store.hasUnread || store.markingAll"
                                @click="onMarkAllRead"
                            >
                                {{ t('header.notifications.markAllRead') }}
                            </v-btn>
                        </div>
                    </div>
                </v-card-item>

                <v-divider />

                <v-card-text>
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
                            class="px-0 py-3"
                            :class="{ 'bg-lightprimary': !item.isRead }"
                            rounded="md"
                            @click="onItemClick(item)"
                        >
                            <template #prepend>
                                <v-avatar size="48" class="mr-3" color="lightprimary">
                                    <v-img v-if="item.photoUrl" :src="item.photoUrl" width="48" :alt="item.title" />
                                    <span v-else class="text-h6 text-primary">{{ item.title.charAt(0) }}</span>
                                </v-avatar>
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
                        <v-btn
                            variant="text"
                            color="primary"
                            :loading="store.loadingMore"
                            :disabled="store.loadingMore"
                            @click="onLoadMore"
                        >
                            {{ t('notificationsPage.loadMore') }}
                        </v-btn>
                    </div>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>
