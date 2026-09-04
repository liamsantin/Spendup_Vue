<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LockIcon } from 'vue-tabler-icons';
import {
    isAccountFieldHidden,
    isLightAccountColor,
    resolveAccountBalanceDisplay,
    safeAccountColor,
    formatAccountNumberLine
} from '@/features/accounts/format';
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
const avatarColor = computed(() => safeAccountColor(props.account.color));
const avatarOnDark = computed(() => Boolean(avatarColor.value) && !isLightAccountColor(props.account.color));

const accountNumberLine = computed(() =>
    formatAccountNumberLine(props.account, {
        hidden: t('comptesPage.list.accountNumberHidden'),
        visible: (number) => t('comptesPage.list.accountNumber', { number })
    })
);
</script>

<template>
    <button
        type="button"
        class="su-person account-list-item"
        :data-account-id="account.publicId"
        :aria-current="focused ? 'true' : undefined"
        :class="{
            'is-focused': focused,
            'opacity-60': !account.isActive,
            'account-list-item--promoted': promoted
        }"
        @click="emit('open', account)"
    >
        <span
            class="su-person__avatar su-person__avatar--tile account-list-item__avatar"
            :class="{ 'account-list-item__avatar--on-dark': avatarOnDark }"
            :style="avatarColor ? { background: avatarColor } : undefined"
        >
            {{ account.name.slice(0, 1).toUpperCase() }}
        </span>
        <div class="su-person__meta">
            <div class="account-list-item__title">
                <p class="su-person__name">{{ account.name }}</p>
                <div class="account-list-item__balance">
                    <LockIcon v-if="balanceDisplay.hidden" size="16" stroke-width="1.5" aria-hidden="true" />
                    <span>
                        {{ balanceDisplay.text }}
                        <span v-if="balanceDisplay.hidden" class="sr-only">{{ t('comptesPage.detail.fieldHidden') }}</span>
                    </span>
                </div>
            </div>
            <p class="su-person__sub">{{ typeLabel }} · {{ account.currency }}{{ accountNumberLine }}</p>
            <div v-if="account.isPrimary || !account.isActive || !account.isOwned" class="account-list-item__chips">
                <span v-if="account.isPrimary" class="su-chip">{{ t('comptesPage.badges.primary') }}</span>
                <span v-if="!account.isActive" class="su-chip su-btn--warn">{{ t('comptesPage.badges.archived') }}</span>
                <span v-if="!account.isOwned" class="su-chip">{{ roleLabel }}</span>
            </div>
        </div>
    </button>
</template>

<style scoped>
.account-list-item__avatar {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
}

.account-list-item__avatar--on-dark {
    color: #fff;
}

.account-list-item__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
}

.account-list-item__title .su-person__name {
    min-width: 0;
}

.account-list-item__balance {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    color: var(--ink);
    font-size: 14.5px;
    font-weight: 600;
}

.account-list-item__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
}

.account-list-item--promoted {
    animation: account-promote-pulse 0.9s ease;
}

@keyframes account-promote-pulse {
    0% {
        background-color: transparent;
        transform: scale(1);
    }
    35% {
        background-color: var(--hair);
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
