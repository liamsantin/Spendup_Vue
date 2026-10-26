<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowRightIcon, LockIcon, PencilIcon } from 'vue-tabler-icons';
import { isAccountFieldHidden, resolveAccountBalanceDisplay, safeAccountColor, formatAccountNumberLine } from '@/features/accounts/format';
import { canEditAccount } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account } from '@/features/accounts/types';

const props = defineProps<{
    account: Account;
}>();

const emit = defineEmits<{
    open: [account: Account];
    edit: [account: Account];
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
/** Nom du tier banque (renommable), pas le nom officiel SIX. */
const bankName = computed(() => props.account.bank?.name ?? props.account.institutionName);
const roleLabel = computed(() => t(`comptesPage.roles.${props.account.myRole}`));
const focused = computed(() => store.isFocusedAccount(props.account.publicId));
const promoted = computed(() => store.isPromotedAccount(props.account.publicId));
const color = computed(() => safeAccountColor(props.account.color));
const editable = computed(() => canEditAccount(props.account));
const ibanHidden = computed(() => isAccountFieldHidden(props.account, 'iban'));

const accountNumberLine = computed(() =>
    formatAccountNumberLine(props.account, {
        hidden: t('comptesPage.list.accountNumberHidden'),
        visible: (number) => t('comptesPage.list.accountNumber', { number })
    })
);

/** Sous-ligne : banque (ou type si aucune banque) · devise · n° de compte. */
const subline = computed(() => {
    const parts = [bankName.value ?? typeLabel.value, props.account.currency];
    return `${parts.join(' · ')}${accountNumberLine.value}`;
});

function onEdit() {
    emit('edit', props.account);
}
</script>

<template>
    <article
        class="account-block"
        :data-account-id="account.publicId"
        tabindex="-1"
        :aria-current="focused ? 'true' : undefined"
        :class="{
            'is-focused': focused,
            'is-archived': !account.isActive,
            'account-block--promoted': promoted
        }"
        @dblclick="onEdit"
    >
        <button type="button" class="account-block__open" :aria-label="account.name" @click="emit('open', account)" />

        <h3 class="account-block__name">
            <span v-if="color" class="su-sq" :style="{ '--sq-color': color }" aria-hidden="true" />
            <span class="account-block__name-text">{{ account.name }}</span>
        </h3>
        <p class="account-block__sub">{{ subline }}</p>

        <p class="su-fig__num account-block__balance">
            <LockIcon v-if="balanceDisplay.hidden" :size="18" stroke-width="1.5" aria-hidden="true" />
            <span>{{ balanceDisplay.text }}</span>
            <span v-if="balanceDisplay.hidden" class="sr-only">{{ t('comptesPage.detail.fieldHidden') }}</span>
        </p>

        <p v-if="ibanHidden" class="account-block__iban">
            <LockIcon :size="12" stroke-width="1.5" aria-hidden="true" />
            {{ t('comptesPage.detail.fieldHidden') }}
        </p>
        <p v-else-if="account.iban" class="account-block__iban">{{ account.iban }}</p>

        <p v-if="account.isPrimary || !account.isActive || !account.isOwned" class="account-block__tags">
            <span v-if="account.isPrimary" class="su-chip" style="--chip-color: var(--blue)">{{ t('comptesPage.badges.primary') }}</span>
            <span v-if="!account.isActive" class="su-chip" style="--chip-color: var(--gray)">{{ t('comptesPage.badges.archived') }}</span>
            <span v-if="!account.isOwned" class="su-chip" style="--chip-color: var(--violet)">{{ roleLabel }}</span>
        </p>

        <div class="account-block__actions">
            <button v-if="editable" type="button" class="su-orb" :aria-label="t('comptesPage.actions.edit')" @click.stop="onEdit">
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button type="button" class="su-orb" :aria-label="t('comptesPage.detail.title')" @click.stop="emit('open', account)">
                <ArrowRightIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </article>
</template>

<style scoped>
/* Carte légère : bordure fine, nom 700 16 px, banque grise, solde 30 px, IBAN mono. */
.account-block {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 0;
    padding: 18px 20px 16px;
    border: 1px solid var(--line);
    background: var(--bg);
    transition: border-color 0.15s var(--ease);
}

.account-block:hover,
.account-block:focus-within {
    border-color: var(--ink);
}

.account-block.is-focused {
    background: var(--blue-soft);
}

.account-block.is-archived > :not(.account-block__actions):not(.account-block__open) {
    opacity: 0.6;
}

/* toute la surface ouvre le détail ; les actions passent devant */
.account-block__open {
    position: absolute;
    inset: 0;
    z-index: 0;
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
}

.account-block__open:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.account-block > :not(.account-block__open):not(.account-block__actions) {
    position: relative;
    z-index: 1;
    pointer-events: none;
}

.account-block__name {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding-right: 88px;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
}

.account-block__name-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.account-block__sub {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-block__balance {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
}

.account-block__iban {
    margin: 16px 0 0;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--gray);
    font-family: var(--font-mono);
    font-size: 12.5px;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-block__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 10px 0 0;
}

/* actions en coin : visibles au survol / clavier, toujours visibles sur mobile */
.account-block__actions {
    position: absolute;
    top: 6px;
    right: 4px;
    z-index: 2;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.account-block:hover .account-block__actions,
.account-block:focus-within .account-block__actions {
    opacity: 1;
}

.account-block--promoted {
    animation: account-promote-pulse 0.9s var(--ease);
}

@keyframes account-promote-pulse {
    0% {
        background-color: transparent;
    }
    35% {
        background-color: var(--blue-soft);
    }
    100% {
        background-color: transparent;
    }
}

@media (prefers-reduced-motion: reduce) {
    .account-block--promoted {
        animation: none;
    }
}

@media (hover: none), (max-width: 767px) {
    .account-block__actions {
        opacity: 1;
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
