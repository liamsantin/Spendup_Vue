<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon, TrashIcon } from 'vue-tabler-icons';
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
}>();

const emit = defineEmits<{
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
    <div class="snapshots-list__item">
        <div class="snapshots-list__body min-width-0">
            <div class="snapshots-list__primary d-flex align-center justify-space-between ga-2">
                <div class="snapshots-list__amount text-body-1 font-weight-bold text-truncate">
                    {{ formatAccountBalance(snapshot.balance, currency, locale) }}
                </div>
                <div class="d-flex align-center ga-1 flex-shrink-0">
                    <v-chip size="x-small" variant="tonal" color="primary">
                        {{ t(`comptesPage.snapshots.sources.${snapshot.source}`) }}
                    </v-chip>
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
            <div class="snapshots-list__date d-flex align-center ga-1 text-caption text-medium-emphasis">
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
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius-leaf);
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.snapshots-list__body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.snapshots-list__amount {
    line-height: 1.2;
}

.snapshots-list__date {
    margin-top: 1px;
    line-height: 1.2;
}

.snapshots-list__author,
.snapshots-list__note {
    margin-top: 4px;
}
</style>
