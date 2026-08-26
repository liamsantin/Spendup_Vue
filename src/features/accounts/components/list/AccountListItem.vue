<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LockIcon } from 'vue-tabler-icons';
import { isAccountFieldHidden, isLightAccountColor, resolveAccountBalanceDisplay, safeAccountColor } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account } from '@/features/accounts/types';

const props = defineProps<{
    account: Account;
}>();

const emit = defineEmits<{
    open: [account: Account];
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const balanceDisplay = computed(() =>
    resolveAccountBalanceDisplay(
        props.account.currentBalance,
        props.account.currency,
        isAccountFieldHidden(props.account, 'balance'),
        locale.value
    )
);
const typeLabel = computed(() => t(`comptesPage.types.${props.account.type}`));
const roleLabel = computed(() => t(`comptesPage.roles.${props.account.myRole}`));
const focused = computed(() => store.isFocusedAccount(props.account.publicId));
const promoted = computed(() => store.isPromotedAccount(props.account.publicId));
const avatarColor = computed(() => safeAccountColor(props.account.color) || 'lightprimary');
const avatarTextClass = computed(() => (isLightAccountColor(props.account.color) ? 'text-primary' : 'text-white'));

const accountNumberLine = computed(() => {
    if (isAccountFieldHidden(props.account, 'accountNumber')) {
        return ` · ${t('comptesPage.list.accountNumberHidden')}`;
    }
    if (props.account.accountNumber) {
        return ` · ${t('comptesPage.list.accountNumber', { number: props.account.accountNumber })}`;
    }
    return '';
});
</script>

<template>
    <v-list-item
        link
        color="primary"
        class="account-list-item px-2 py-3"
        rounded="md"
        tabindex="-1"
        :data-account-id="account.publicId"
        :aria-current="focused ? 'true' : undefined"
        :class="{
            'bg-lightprimary': focused,
            'opacity-60': !account.isActive,
            'account-list-item--promoted': promoted
        }"
        @click="emit('open', account)"
    >
        <template #prepend>
            <v-avatar size="46" class="mr-3" rounded="md" :color="avatarColor">
                <span class="text-subtitle-2 font-weight-bold" :class="avatarTextClass">
                    {{ account.name.slice(0, 1).toUpperCase() }}
                </span>
            </v-avatar>
        </template>

        <div class="account-list-item__body w-100">
            <div class="d-flex align-center justify-space-between ga-2">
                <h6 class="text-subtitle-1 font-weight-bold mb-0 text-truncate min-width-0">{{ account.name }}</h6>
                <div class="text-subtitle-1 font-weight-semibold text-right flex-shrink-0 d-flex align-center ga-1">
                    <LockIcon
                        v-if="balanceDisplay.hidden"
                        size="16"
                        stroke-width="1.5"
                        class="text-medium-emphasis"
                        aria-hidden="true"
                    />
                    <span>
                        {{ balanceDisplay.text }}
                        <span v-if="balanceDisplay.hidden" class="sr-only">{{ t('comptesPage.detail.fieldHidden') }}</span>
                    </span>
                </div>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0 text-truncate">
                {{ typeLabel }} · {{ account.currency }}{{ accountNumberLine }}
            </p>
            <div v-if="account.isPrimary || !account.isActive || !account.isOwned" class="d-flex align-center ga-2 flex-wrap mt-1">
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

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
</style>
