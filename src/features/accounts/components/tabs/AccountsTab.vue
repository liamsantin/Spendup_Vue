<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { shouldVirtualize } from '@/utils/helpers/list-virtualization';
import { useUserSettingsStore } from '@/features/user-settings';
import { isBalanceHidden, safeAccountColor } from '@/features/accounts/format';
import { canEditAccount } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account } from '@/features/accounts/types';
import AccountDetailModal from '@/features/accounts/components/modals/AccountDetailModal.vue';
import AccountFormModal from '@/features/accounts/components/modals/AccountFormModal.vue';
import AccountListItem from '@/features/accounts/components/list/AccountListItem.vue';

/** Hauteur d'un bloc compte en liste virtualisée (une colonne). */
const VIRTUAL_ITEM_HEIGHT = 196;

/** Couleurs de repli de la barre de répartition (bleu / violet / bleu pâle / noir), quand le compte n'a pas de couleur. */
const FALLBACK_SEGMENT_COLORS = ['var(--blue)', 'var(--violet)', 'color-mix(in srgb, var(--blue) 32%, var(--bg))', 'var(--ink)'];

const { t, locale } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();
const settings = useUserSettingsStore();

function useVirtualList(length: number) {
    // Deep-link focus : garder la ligne dans le DOM (virtual scroll la retirerait).
    if (store.focusAccountPublicId) return false;
    return !smAndDown.value && shouldVirtualize(length);
}

const createOpen = ref(false);
const detailOpen = ref(false);
const detailAccountId = ref<string | null>(null);
const editAccount = ref<Account | null>(null);

/** Comptes actifs dont le solde est visible (propres + partagés). */
const visibleBalanceAccounts = computed(() =>
    store.accounts.filter((account) => account.isActive && !isBalanceHidden(account) && account.currentBalance != null)
);

/**
 * Devise de la valeur nette : la devise par défaut des réglages si au moins un compte l'utilise,
 * sinon celle du premier compte visible. Les comptes d'une autre devise ne sont pas additionnés.
 */
const netWorthCurrency = computed(() => {
    const preferred = settings.current.defaultCurrency;
    if (visibleBalanceAccounts.value.some((account) => account.currency === preferred)) return preferred;
    return visibleBalanceAccounts.value[0]?.currency ?? preferred;
});

const netWorthAccounts = computed(() => visibleBalanceAccounts.value.filter((account) => account.currency === netWorthCurrency.value));

const netWorth = computed(() => netWorthAccounts.value.reduce((sum, account) => sum + (account.currentBalance ?? 0), 0));

/** Partie entière / décimales du chiffre héros, selon la locale (le formatage reste celui d'`Intl`). */
const netWorthParts = computed(() => {
    const parts = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(netWorth.value);
    const decimalIndex = parts.findIndex((part) => part.type === 'decimal');
    // apostrophe typographique pour les milliers (format suisse de la D.A.)
    const text = (list: Intl.NumberFormatPart[]) => list.map((part) => (part.type === 'group' ? '’' : part.value)).join('');
    if (decimalIndex < 0) return { integer: text(parts), fraction: '' };
    return {
        integer: text(parts.slice(0, decimalIndex)),
        fraction: text(parts.slice(decimalIndex))
    };
});

const percentFormatter = computed(() => new Intl.NumberFormat(locale.value || undefined, { style: 'percent', maximumFractionDigits: 0 }));

/** Segments de la barre de répartition : un par compte à solde positif, coloré par la couleur du compte ou l'alternance de repli. */
const segments = computed(() => {
    const positive = netWorthAccounts.value.filter((account) => (account.currentBalance ?? 0) > 0);
    const total = positive.reduce((sum, account) => sum + (account.currentBalance ?? 0), 0);
    if (total <= 0) return [];
    return positive.map((account, index) => {
        const share = (account.currentBalance ?? 0) / total;
        return {
            publicId: account.publicId,
            name: account.name,
            share,
            percent: percentFormatter.value.format(share),
            color: safeAccountColor(account.color) ?? FALLBACK_SEGMENT_COLORS[index % FALLBACK_SEGMENT_COLORS.length]
        };
    });
});

const showNetWorth = computed(() => store.initialized && netWorthAccounts.value.length > 0);

function openDetail(account: Account) {
    detailAccountId.value = account.publicId;
    detailOpen.value = true;
}

function openEdit(account: Account) {
    if (!canEditAccount(account)) return;
    detailOpen.value = false;
    editAccount.value = account;
}

function setEditOpen(value: boolean) {
    if (!value) editAccount.value = null;
}

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });
</script>

<template>
    <div class="accounts-tab su-stack">
        <AppAlert v-if="store.error" type="error" class="su-alert" closable :dismiss-ms="3000" @dismiss="store.clearError()">
            {{ store.error }}
        </AppAlert>

        <!-- Valeur nette : chiffre héros + barre de répartition empilée, légende sous chaque segment. -->
        <section v-if="showNetWorth" class="net-worth" :aria-label="t('comptesPage.hero.netWorth')">
            <p class="su-fig__label net-worth__label">
                {{ t('comptesPage.hero.netWorth') }}
                <span class="net-worth__currency">{{ netWorthCurrency }}</span>
            </p>
            <p class="su-hero-num net-worth__num">
                {{ netWorthParts.integer }}<small>{{ netWorthParts.fraction }}</small>
            </p>
            <div v-if="segments.length" class="net-worth__bar">
                <div
                    v-for="segment in segments"
                    :key="segment.publicId"
                    class="net-worth__segment"
                    :class="{ 'is-narrow': segment.share < 0.07 }"
                    :style="{ flex: `${segment.share} 1 0%`, '--segment-color': segment.color }"
                    :title="`${segment.name} · ${segment.percent}`"
                >
                    <span class="net-worth__segment-fill" aria-hidden="true" />
                    <span class="net-worth__segment-name">{{ segment.name }}</span>
                    <span class="net-worth__segment-pct">{{ segment.percent }}</span>
                </div>
            </div>
        </section>

        <!-- deux colonnes : mes comptes | partagés avec moi -->
        <div class="accounts-columns">
            <section class="su-surface accounts-col">
                <h2 class="su-h2 accounts-col__title">{{ t('comptesPage.sections.owned') }}</h2>

                <div v-if="store.loadingAccounts && !store.ownedAccounts.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.ownedAccounts.length" class="su-empty">
                    {{ t('comptesPage.empty.owned') }}
                </div>
                <template v-else>
                    <div v-if="store.activeOwnedAccounts.length" class="accounts-list">
                        <v-virtual-scroll
                            v-if="useVirtualList(store.activeOwnedAccounts.length)"
                            :items="store.activeOwnedAccounts"
                            height="520"
                            :item-height="VIRTUAL_ITEM_HEIGHT"
                            class="py-0"
                        >
                            <template #default="{ item }">
                                <AccountListItem :account="item" class="accounts-list__virtual-item" @open="openDetail" @edit="openEdit" />
                            </template>
                        </v-virtual-scroll>
                        <TransitionGroup v-else name="account-move" tag="div" class="accounts-grid">
                            <AccountListItem
                                v-for="account in store.activeOwnedAccounts"
                                :key="account.publicId"
                                :account="account"
                                @open="openDetail"
                                @edit="openEdit"
                            />
                        </TransitionGroup>
                    </div>
                    <div v-if="store.archivedOwnedAccounts.length" class="accounts-archived">
                        <p class="su-section-label">{{ t('comptesPage.sections.archived') }}</p>
                        <v-virtual-scroll
                            v-if="useVirtualList(store.archivedOwnedAccounts.length)"
                            :items="store.archivedOwnedAccounts"
                            height="400"
                            :item-height="VIRTUAL_ITEM_HEIGHT"
                            class="py-0"
                        >
                            <template #default="{ item }">
                                <AccountListItem :account="item" class="accounts-list__virtual-item" @open="openDetail" @edit="openEdit" />
                            </template>
                        </v-virtual-scroll>
                        <div v-else class="accounts-grid">
                            <AccountListItem
                                v-for="account in store.archivedOwnedAccounts"
                                :key="account.publicId"
                                :account="account"
                                @open="openDetail"
                                @edit="openEdit"
                            />
                        </div>
                    </div>
                </template>
            </section>

            <section class="su-surface accounts-col">
                <h2 class="su-h2 accounts-col__title">{{ t('comptesPage.sections.shared') }}</h2>

                <div v-if="store.loadingAccounts && !store.sharedAccounts.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.sharedAccounts.length" class="su-empty">
                    {{ t('comptesPage.empty.shared') }}
                </div>
                <v-virtual-scroll
                    v-else-if="useVirtualList(store.sharedAccounts.length)"
                    :items="store.sharedAccounts"
                    height="520"
                    :item-height="VIRTUAL_ITEM_HEIGHT"
                    class="py-0"
                >
                    <template #default="{ item }">
                        <AccountListItem :account="item" class="accounts-list__virtual-item" @open="openDetail" @edit="openEdit" />
                    </template>
                </v-virtual-scroll>
                <div v-else class="accounts-grid">
                    <AccountListItem
                        v-for="account in store.sharedAccounts"
                        :key="account.publicId"
                        :account="account"
                        @open="openDetail"
                        @edit="openEdit"
                    />
                </div>
            </section>
        </div>

        <AccountFormModal v-model="createOpen" />
        <AccountFormModal :model-value="!!editAccount" :account="editAccount" @update:model-value="setEditOpen" />
        <AccountDetailModal v-model="detailOpen" :account-public-id="detailAccountId" />
    </div>
</template>

<style scoped>
/* ── valeur nette ───────────────────────────────────── */
.net-worth__label {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.net-worth__currency {
    color: var(--gray);
    font-size: 12px;
}

.net-worth__num {
    margin-top: 8px;
}

/* barre empilée carrée, 48 px : chaque segment porte sa légende dessous */
.net-worth__bar {
    display: flex;
    gap: 4px;
    margin-top: 20px;
}

.net-worth__segment {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.net-worth__segment-fill {
    display: block;
    height: 20px;
    background: var(--segment-color, var(--blue));
}

.net-worth__segment-name {
    margin-top: 12px;
    font-size: 14px;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.net-worth__segment-pct {
    margin-top: 6px;
    font-size: 13px;
    color: var(--gray);
    font-variant-numeric: tabular-nums;
}

/* segment trop étroit : la légende passe dans l'infobulle (title) */
.net-worth__segment.is-narrow .net-worth__segment-name,
.net-worth__segment.is-narrow .net-worth__segment-pct {
    visibility: hidden;
}

/* ── deux colonnes : mes comptes | partagés ───────────── */
.accounts-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 40px 48px;
    align-items: start;
}

.accounts-col {
    min-width: 0;
}

.accounts-col__title {
    margin-bottom: 16px;
}

.accounts-col .su-empty {
    min-height: 120px;
    align-items: flex-start;
    padding: 20px 24px;
    border: 1px dashed var(--line);
    text-align: left;
}

/* ── cartes de compte : 2 par colonne, 1 en dessous de 1400 px ── */
.accounts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
}

.accounts-list {
    overflow-x: clip;
}

.accounts-archived {
    margin-top: 32px;
}

.accounts-list__virtual-item {
    box-sizing: border-box;
    height: 196px;
}

.account-move-move {
    transition: transform 0.4s var(--ease);
}

@media (prefers-reduced-motion: reduce) {
    .account-move-move {
        transition: none;
    }
}

@media (max-width: 1099.98px) {
    .accounts-columns {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 767px) {
    .accounts-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    .net-worth__bar {
        gap: 2px;
    }

    .net-worth__segment-name {
        font-size: 13px;
    }
}
</style>
