<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useAuthStore } from '@/features/auth';
import { UserPhotoAvatar } from '@/features/friends';
import { formatAccountBalance, formatSnapshotDate } from '@/features/accounts/format';
import type { AccountBalanceSnapshot, Currency } from '@/features/accounts/types';

const props = defineProps<{
    snapshot: AccountBalanceSnapshot;
    currency: Currency;
    canWrite: boolean;
    showAuthor: boolean;
    acting: boolean;
    latest?: boolean;
}>();

const emit = defineEmits<{
    edit: [snapshot: AccountBalanceSnapshot];
    delete: [snapshot: AccountBalanceSnapshot];
}>();

const { t, locale } = useI18n();
const auth = useAuthStore();

function formatDate(value: string) {
    return formatSnapshotDate(value, locale.value);
}

const authorLabel = computed(() => {
    const mine = auth.user?.userPublicId;
    if (mine && props.snapshot.createdByUserPublicId === mine) {
        return t('comptesPage.snapshots.createdByMe');
    }
    const name = props.snapshot.createdByDisplayName;
    return name?.trim() ? t('comptesPage.snapshots.createdBy', { name }) : t('comptesPage.snapshots.createdByUnknown');
});
</script>

<template>
    <div class="snapshots-list__item" :class="{ 'is-latest': latest }">
        <span class="snapshots-list__marker" aria-hidden="true" />
        <div class="snapshots-list__body min-width-0">
            <div class="snapshots-list__primary d-flex align-center justify-space-between ga-2">
                <div class="snapshots-list__amount text-truncate">
                    {{ formatAccountBalance(snapshot.balance, currency, locale) }}
                </div>
                <div class="d-flex align-center ga-1 flex-shrink-0">
                    <v-chip size="x-small" variant="tonal" color="primary">
                        {{ t(`comptesPage.snapshots.sources.${snapshot.source}`) }}
                    </v-chip>
                    <button
                        v-if="canWrite && snapshot.source === 'manual'"
                        type="button"
                        class="su-orb"
                        :disabled="acting"
                        :aria-label="t('comptesPage.snapshots.edit')"
                        @click="emit('edit', snapshot)"
                    >
                        <PencilIcon size="16" stroke-width="1.75" />
                    </button>
                    <button
                        v-if="canWrite"
                        type="button"
                        class="su-orb su-orb--danger"
                        :disabled="acting"
                        :aria-label="t('comptesPage.snapshots.deleteModal.confirm')"
                        @click="emit('delete', snapshot)"
                    >
                        <TrashIcon size="16" stroke-width="1.75" />
                    </button>
                </div>
            </div>
            <div class="snapshots-list__date d-flex align-center ga-1">
                <CalendarIcon size="12" stroke-width="1.5" />
                <span>{{ formatDate(snapshot.snapshotAt) }}</span>
            </div>
            <div v-if="showAuthor" class="snapshots-list__author d-flex align-center ga-2 min-width-0">
                <UserPhotoAvatar
                    :photo-url="snapshot.createdByPhotoUrl"
                    :user-public-id="snapshot.createdByUserPublicId"
                    :fallback-label="snapshot.createdByDisplayName ?? undefined"
                    :size="20"
                />
                <span class="text-caption text-medium-emphasis text-truncate">
                    {{ authorLabel }}
                </span>
            </div>
            <div v-if="snapshot.note" class="snapshots-list__note text-caption text-medium-emphasis text-truncate">
                {{ snapshot.note }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.snapshots-list__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius-leaf);
    background: var(--surface-raised);
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.snapshots-list__marker {
    position: absolute;
    top: 50%;
    left: -19px;
    z-index: 1;
    width: 10px;
    height: 10px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--surface-overlay);
    border: 2px solid rgba(var(--v-theme-primary), 0.32);
    box-shadow: 0 0 0 3px var(--surface-overlay);
    pointer-events: none;
}

.snapshots-list__item.is-latest .snapshots-list__marker {
    background: rgb(var(--v-theme-primary));
    border-color: rgb(var(--v-theme-primary));
    box-shadow:
        0 0 0 3px var(--surface-overlay),
        0 0 0 6px rgba(var(--v-theme-primary), 0.14);
}

.snapshots-list__body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.snapshots-list__amount {
    font-size: 14.5px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: var(--ink);
}

.snapshots-list__date {
    margin-top: 1px;
    color: var(--ink-muted);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.15;
}

.snapshots-list__author,
.snapshots-list__note {
    margin-top: 6px;
}
</style>
