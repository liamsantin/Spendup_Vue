<script setup lang="ts">
/**
 * Fiche d’un tiers (page, même structure que la fiche d’un actif). Onglets portés par `?tab=` :
 * Informations (nature, rôles, coordonnées, identité, banque, notes), Transactions (celles du tiers) et Justificatifs.
 * La modification reste dans `TierFormModal`.
 */
defineOptions({ name: 'TierDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { entityAttachmentSource } from '@/features/attachments/api';
import EntityAttachmentsPanel from '@/features/attachments/components/EntityAttachmentsPanel.vue';
import TierFormModal from '@/features/tiers/components/modals/TierFormModal.vue';
import LinkedTransactionsPanel from '@/features/transactions/components/LinkedTransactionsPanel.vue';
import AssetLinkTransactionsModal from '@/features/transactions/components/modals/AssetLinkTransactionsModal.vue';
import { transactionFormFieldsWithTier } from '@/features/transactions/link-asset';
import { TIER_NATURE_ICONS, tierNatureTileClass } from '@/features/tiers/natureUi';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { isCipher } from '@/features/vault/crypto';

export type TierDetailTab = 'informations' | 'transactions' | 'attachments';

const props = defineProps<{
    tierPublicId: string;
    tab: TierDetailTab;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const store = useTiersStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);
const linkOpen = ref(false);
/** Change après un rattachement : la liste de l’onglet se recharge. */
const transactionsKey = ref(0);

const tier = computed(() => store.findByPublicId(props.tierPublicId));
const attachmentSource = computed(() => entityAttachmentSource('tier', props.tierPublicId));

type Fact = { id: string; label: string; value: string; href?: string };

/** Valeur lisible, ou « illisible » si le Coffre n’a pas pu l’ouvrir. */
function readable(value: string | null | undefined): string | null {
    if (value == null) return null;
    const text = value.trim();
    if (!text) return null;
    return isCipher(text) ? t('vault.unreadable') : text;
}

function formatDate(ymd: string): string {
    const date = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(date.getTime())) return ymd;
    return new Intl.DateTimeFormat(locale.value || 'fr-CH', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function collect(entries: [id: string, label: string, value: string | null | undefined, href?: string][]): Fact[] {
    const list: Fact[] = [];
    for (const [id, label, raw, href] of entries) {
        const value = readable(raw);
        if (!value) continue;
        list.push({ id, label, value, href: raw && !isCipher(raw) ? href : undefined });
    }
    return list;
}

const field = (key: string) => t(`tiersPage.form.fields.${key}`);

const contactFacts = computed<Fact[]>(() => {
    const current = tier.value;
    if (!current) return [];
    return collect([
        ['email', field('email'), current.email, current.email ? `mailto:${current.email}` : undefined],
        ['phone', field('phone'), current.phone, current.phone ? `tel:${current.phone.replace(/[^\d+]/g, '')}` : undefined],
        ['website', field('website'), current.website, current.website ?? undefined]
    ]);
});

const identityFacts = computed<Fact[]>(() => {
    const current = tier.value;
    if (!current) return [];
    const roles = current.roles.map((role) => t(`tiersPage.roles.${role}`)).join(', ');
    return collect([
        ['nature', field('nature'), t(`tiersPage.natures.${current.nature}`)],
        ['roles', field('roles'), roles],
        ['firstName', field('firstName'), current.person?.firstName],
        ['lastName', field('lastName'), current.person?.lastName],
        ['birthDate', field('birthDate'), current.person?.birthDate ? formatDate(current.person.birthDate) : null],
        ['legalName', field('legalName'), current.company?.legalName],
        ['vatNumber', field('vatNumber'), current.company?.vatNumber],
        ['companyRegistrationNumber', field('companyRegistrationNumber'), current.company?.companyRegistrationNumber],
        ['officialName', field('officialName'), current.organization?.officialName],
        ['organizationType', field('organizationType'), current.organization?.organizationType]
    ]);
});

const bankFacts = computed<Fact[]>(() => {
    const bank = tier.value?.bank;
    if (!bank) return [];
    return collect([
        ['bank', field('bank'), bank.bankName],
        ['bic', field('bic'), bank.bic],
        ['iid', field('iid'), bank.iid]
    ]);
});

const sections = computed(() =>
    [
        { id: 'identity', title: t('tiersPage.detail.sections.identity'), facts: identityFacts.value },
        { id: 'contact', title: t('tiersPage.detail.sections.contact'), facts: contactFacts.value },
        { id: 'bank', title: t('tiersPage.detail.sections.bank'), facts: bankFacts.value }
    ].filter((section) => section.facts.length)
);

const notes = computed(() => readable(tier.value?.notes));

async function loadTier() {
    const id = props.tierPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchTier(id);
        if (!fresh) emit('not-found');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            emit('not-found');
            return;
        }
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    unsubscribeDeleted = store.subscribeToDeleted((id) => {
        if (id === props.tierPublicId) emit('not-found');
    });
});

onUnmounted(() => {
    unsubscribeDeleted?.();
});

watch(
    () => props.tierPublicId,
    () => {
        editOpen.value = false;
        void loadTier();
    },
    { immediate: true }
);

function openEdit() {
    if (tier.value) editOpen.value = true;
}

defineExpose({ openEdit, reload: loadTier });
</script>

<template>
    <div class="tier-detail" :class="{ 'su-fill': tab === 'transactions' }">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link tier-detail__retry" @click="loadTier">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!tier && loading" class="su-loading" :aria-label="t('tiersPage.detail.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="tier">
            <div v-if="tab === 'informations'" class="tier-detail__info">
                <!-- en-tête : carré teinté de la nature, nature et rôles en clair -->
                <div class="tier-detail__lead">
                    <span :class="tierNatureTileClass(tier.nature)" aria-hidden="true">
                        <component :is="TIER_NATURE_ICONS[tier.nature]" :size="18" stroke-width="1.7" />
                    </span>
                    <div class="tier-detail__lead-text">
                        <p class="tier-detail__nature">{{ t(`tiersPage.natures.${tier.nature}`) }}</p>
                        <p v-if="tier.roles.length" class="tier-detail__roles">
                            {{ tier.roles.map((role) => t(`tiersPage.roles.${role}`)).join(' · ') }}
                        </p>
                    </div>
                </div>

                <section v-for="section in sections" :key="section.id" class="tier-detail__section">
                    <h2 class="su-h2 tier-detail__title">{{ section.title }}</h2>
                    <div class="tier-detail__sheet">
                        <div v-for="fact in section.facts" :key="fact.id" class="su-kv">
                            <span>{{ fact.label }}</span>
                            <a v-if="fact.href" :href="fact.href" class="tier-detail__link" rel="noopener noreferrer">{{ fact.value }}</a>
                            <span v-else>{{ fact.value }}</span>
                        </div>
                    </div>
                </section>

                <p v-if="!contactFacts.length" class="tier-detail__empty">{{ t('tiersPage.detail.noContact') }}</p>

                <section v-if="notes" class="tier-detail__section">
                    <h2 class="su-h2 tier-detail__title">{{ t('tiersPage.detail.sections.notes') }}</h2>
                    <p class="tier-detail__notes">{{ notes }}</p>
                </section>
            </div>

            <LinkedTransactionsPanel
                v-else-if="tab === 'transactions'"
                :key="transactionsKey"
                :locked-filters="{ tier: tierPublicId }"
                :unlink-fields="(transaction) => transactionFormFieldsWithTier(transaction, '')"
                @link="linkOpen = true"
            />
            <EntityAttachmentsPanel v-else-if="tab === 'attachments'" :source="attachmentSource" />

            <TierFormModal v-model="editOpen" :tier="tier" />
            <AssetLinkTransactionsModal v-model="linkOpen" :tier-public-id="tierPublicId" @linked="transactionsKey += 1" />
        </template>
    </div>
</template>

<style scoped>
.tier-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.tier-detail__info {
    display: flex;
    flex-direction: column;
    gap: 40px;
    min-width: 0;
}

.tier-detail__lead {
    display: flex;
    align-items: center;
    gap: 14px;
}

.tier-detail__lead-text {
    min-width: 0;
}

.tier-detail__nature {
    margin: 0;
    font-weight: 700;
}

.tier-detail__roles {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
}

/* titre de section : 16 px 700 sur filet 2 px */
.tier-detail__title {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--ink);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.tier-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.tier-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.tier-detail__link {
    color: var(--blue-ink);
    overflow-wrap: anywhere;
    text-decoration: none;
}

.tier-detail__link:hover {
    text-decoration: underline;
}

.tier-detail__empty {
    margin: -16px 0 0;
    color: var(--gray);
    font-size: 14px;
}

.tier-detail__notes {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
    white-space: pre-wrap;
}

.tier-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .tier-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .tier-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .tier-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }
}
</style>
