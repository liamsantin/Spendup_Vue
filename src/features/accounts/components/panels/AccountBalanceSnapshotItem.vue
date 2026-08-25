<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CalendarIcon, TrashIcon } from 'vue-tabler-icons';
import { UserPhotoAvatar } from '@/features/friends';
import { formatAccountBalance, formatSnapshotDate } from '@/features/accounts/format';
import type { AccountBalanceSnapshot, Currency } from '@/features/accounts/types';

defineProps<{
    snapshot: AccountBalanceSnapshot;
    currency: Currency;
    canWrite: boolean;
    showAuthor: boolean;
    acting: boolean;
}>();

const emit = defineEmits<{
    delete: [snapshot: AccountBalanceSnapshot];
}>();

const { t, locale } = useI18n();

function formatDate(value: string) {
    return formatSnapshotDate(value, locale.value);
}

function authorLabel(name: string | null) {
    return name?.trim() ? t('comptesPage.snapshots.createdBy', { name }) : t('comptesPage.snapshots.createdByUnknown');
}
</script>

<template>
    <div class="snapshots-list__item">
        <div class="snapshots-list__body min-width-0">
            <div class="d-flex align-center justify-space-between ga-2">
                <div class="text-body-1 font-weight-bold text-truncate">
                    {{ formatAccountBalance(snapshot.balance, currency, locale) }}
                </div>
                <div class="d-flex align-center ga-1 flex-shrink-0">
                    <v-chip size="x-small" variant="tonal" color="primary">
                        {{ t(`comptesPage.snapshots.sources.${snapshot.source}`) }}
                    </v-chip>
                    <v-btn
                        v-if="canWrite"
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="acting"
                        :icon="true"
                        :aria-label="t('comptesPage.snapshots.deleteModal.confirm')"
                        @click="emit('delete', snapshot)"
                    >
                        <TrashIcon size="16" />
                    </v-btn>
                </div>
            </div>
            <div class="d-flex align-center ga-1 text-caption text-medium-emphasis">
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
                    {{ authorLabel(snapshot.createdByDisplayName) }}
                </span>
            </div>
            <div v-if="snapshot.note" class="text-caption text-medium-emphasis text-truncate">
                {{ snapshot.note }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.snapshots-list__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.snapshots-list__body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.snapshots-list__author {
    margin-top: 2px;
}
</style>
