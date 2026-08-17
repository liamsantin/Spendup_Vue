<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatAccountBalance } from '../format';
import { useAccountsStore } from '../stores/accounts-store';
import type { Account } from '../types';

const props = defineProps<{
    account: Account;
}>();

const emit = defineEmits<{
    open: [account: Account];
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const balance = computed(() => formatAccountBalance(props.account.currentBalance, props.account.currency, locale.value));
const typeLabel = computed(() => t(`comptesPage.types.${props.account.type}`));
const roleLabel = computed(() => t(`comptesPage.roles.${props.account.myRole}`));
const focused = computed(() => store.isFocusedAccount(props.account.publicId));
const promoted = computed(() => store.isPromotedAccount(props.account.publicId));
</script>

<template>
    <v-list-item
        link
        color="primary"
        class="account-list-item px-2 py-3"
        rounded="md"
        :data-account-id="account.publicId"
        :class="{
            'bg-lightprimary': focused,
            'opacity-60': !account.isActive,
            'account-list-item--promoted': promoted
        }"
        @click="emit('open', account)"
    >
        <template #prepend>
            <v-avatar size="46" class="mr-3" rounded="md" :color="account.color || 'lightprimary'">
                <span class="text-subtitle-2 font-weight-bold text-white">{{ account.name.slice(0, 1).toUpperCase() }}</span>
            </v-avatar>
        </template>

        <div class="d-flex align-start justify-space-between ga-2 w-100">
            <div class="min-width-0">
                <div class="d-flex align-center ga-2 flex-wrap mb-1">
                    <h6 class="text-subtitle-1 font-weight-bold mb-0 text-truncate">{{ account.name }}</h6>
                    <v-chip v-if="account.isPrimary" size="x-small" color="primary" variant="tonal">
                        {{ t('comptesPage.badges.primary') }}
                    </v-chip>
                    <v-chip v-if="!account.isActive" size="x-small" color="warning" variant="tonal">
                        {{ t('comptesPage.badges.archived') }}
                    </v-chip>
                    <v-chip v-if="!account.isOwned" size="x-small" color="secondary" variant="tonal">
                        {{ roleLabel }}
                    </v-chip>
                </div>
                <p class="text-body-2 text-medium-emphasis mb-0 text-truncate">
                    {{ typeLabel }} · {{ account.currency
                    }}{{ account.accountNumber ? ` · ${t('comptesPage.list.accountNumber', { number: account.accountNumber })}` : '' }}
                </p>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="text-subtitle-1 font-weight-semibold">{{ balance }}</div>
            </div>
        </div>
    </v-list-item>
</template>

<style scoped>
.account-list-item--promoted {
    animation: account-promote-pulse 0.9s ease;
}

@keyframes account-promote-pulse {
    0% {
        background-color: transparent;
        transform: scale(1);
    }
    35% {
        background-color: rgba(var(--v-theme-primary), 0.12);
        transform: scale(1.015);
    }
    100% {
        background-color: transparent;
        transform: scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .account-list-item--promoted {
        animation: none;
    }
}
</style>
