<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppChip from '@/components/shared/AppChip.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { friendLiveChipColor, resolveNotificationLink, useNotificationsStore } from '@/features/notifications';

const router = useRouter();
const store = useNotificationsStore();

function chipLabel(title: string, subtitle: string | null, message: string | null): string {
    const text = title.trim() || subtitle?.trim() || message?.trim() || '';
    return text.length > 48 ? `${text.slice(0, 45)}…` : text;
}

async function onChipClick(key: string, notificationId: number) {
    const chip = store.liveFriendChips.find((c) => c.key === key);
    store.dismissLiveFriendChip(key);
    if (!chip) return;

    if (!chip.notification.isRead) {
        try {
            await store.markRead(notificationId);
        } catch {
            // navigation quand même
        }
    }
    const target = resolveNotificationLink(chip.notification.link, chip.notification);
    if (target) {
        await router.push(target);
    }
}
</script>

<template>
    <div v-if="store.liveFriendChips.length" class="friend-live-chips" aria-live="polite">
        <AppChip
            v-for="chip in store.liveFriendChips"
            :key="chip.key"
            class="text-body-2 friend-live-chips__chip"
            :color="friendLiveChipColor(chip.notification.type)"
            variant="flat"
            closable
            @click="onChipClick(chip.key, chip.notification.id)"
            @dismiss="store.dismissLiveFriendChip(chip.key)"
        >
            <UserPhotoAvatar start :photo-url="chip.notification.photoUrl" :fallback-label="chip.notification.title" :size="25" />
            {{ chipLabel(chip.notification.title, chip.notification.subtitle, chip.notification.message) }}
        </AppChip>
    </div>
</template>

<style scoped>
.friend-live-chips {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-width: min(320px, calc(100% - 24px));
    pointer-events: none;
}

/* Fond couleur plein (variant par défaut) sans transparence du underlay tonal. */
.friend-live-chips__chip {
    pointer-events: auto;
    cursor: pointer;
    max-width: 100%;
    opacity: 1;
    color: rgb(var(--v-theme-on-primary)) !important;
}

.friend-live-chips__chip :deep(.v-chip__underlay) {
    opacity: 1 !important;
}

.friend-live-chips__chip.text-error {
    color: rgb(var(--v-theme-on-error)) !important;
}

.friend-live-chips__chip.text-warning {
    color: rgb(var(--v-theme-on-warning)) !important;
}
</style>
