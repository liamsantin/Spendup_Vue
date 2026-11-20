<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';
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
    <!-- Ligne de relevé : date · source à gauche, montant 700 à droite, filet fin au-dessus ; le dernier relevé porte un carré bleu. -->
    <div class="snapshot-row" :class="{ 'is-latest': latest }">
        <span class="snapshot-row__marker su-sq" :style="{ '--sq-color': latest ? 'var(--blue)' : 'var(--line)' }" aria-hidden="true" />
        <div class="snapshot-row__meta">
            <p class="snapshot-row__date">{{ formatDate(snapshot.snapshotAt) }}</p>
            <p class="snapshot-row__sub">
                {{ t(`comptesPage.snapshots.sources.${snapshot.source}`) }}
                <template v-if="snapshot.note"> · {{ snapshot.note }}</template>
            </p>
            <p v-if="showAuthor" class="snapshot-row__author">
                <UserPhotoAvatar
                    :photo-url="snapshot.createdByPhotoUrl"
                    :user-public-id="snapshot.createdByUserPublicId"
                    :fallback-label="snapshot.createdByDisplayName ?? undefined"
                    :size="18"
                />
                <span>{{ authorLabel }}</span>
            </p>
        </div>
        <p class="snapshot-row__amount">{{ formatAccountBalance(snapshot.balance, currency, locale) }}</p>
        <div v-if="canWrite" class="snapshot-row__actions">
            <button
                v-if="snapshot.source === 'manual'"
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('comptesPage.snapshots.edit')"
                @click="emit('edit', snapshot)"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('comptesPage.snapshots.deleteModal.confirm')"
                @click="emit('delete', snapshot)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.snapshot-row {
    display: grid;
    grid-template-columns: 7px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 14px;
    padding: 12px 4px;
    border-top: 1px solid var(--line);
    transition: background 0.15s var(--ease);
}

.snapshot-row:hover {
    background: var(--soft);
}

.snapshot-row__marker {
    align-self: start;
    margin-top: 6px;
}

.snapshot-row__meta {
    min-width: 0;
}

.snapshot-row__date {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.snapshot-row.is-latest .snapshot-row__date {
    color: var(--blue-ink);
}

.snapshot-row__sub {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.snapshot-row__author {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 0;
    color: var(--gray);
    font-size: 13px;
    min-width: 0;
}

.snapshot-row__amount {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-align: right;
}

.snapshot-row__actions {
    display: flex;
    gap: 2px;
    min-width: 0;
}

/* sans actions, la colonne vide se résorbe */
.snapshot-row:not(:has(.snapshot-row__actions)) {
    grid-template-columns: 7px minmax(0, 1fr) auto;
}
</style>
