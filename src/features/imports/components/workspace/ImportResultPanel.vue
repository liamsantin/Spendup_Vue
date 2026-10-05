<script setup lang="ts">
/** Import clos : `valide` (transactions créées, revert possible) ou `annule` (abandonné / expiré / reverté). */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { ArrowBackUpIcon, CircleCheckIcon, InfoCircleIcon, TemplateIcon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import RecurringSuggestionsPanel from '@/features/recurring-payments/components/RecurringSuggestionsPanel.vue';
import ImportTemplateFormModal from '@/features/imports/components/modals/ImportTemplateFormModal.vue';
import { canDeleteImport, canRevertImport, canSaveImportAsTemplate, formatImportTimestamp } from '@/features/imports/format';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import type { Import, ImportCommitSummary } from '@/features/imports/types';

const props = defineProps<{
    item: Import;
    /** Renvoyé par le commit qui vient d’avoir lieu (sinon : lignes validées). */
    summary?: ImportCommitSummary | null;
}>();

const emit = defineEmits<{
    deleted: [];
}>();

const { t, locale } = useI18n();
const store = useImportsStore();

const revertOpen = ref(false);
const deleteOpen = ref(false);
const templateOpen = ref(false);
const notice = ref<string | null>(null);
const localError = ref<string | null>(null);

const isValid = computed(() => props.item.status === 'valide');
const created = computed(() => props.summary?.createdTransactions ?? props.item.counts.validated);

/** « 5 tiers et 1 moyen de paiement créés » : seulement juste après le commit. */
const createdEntitiesText = computed(() => {
    const tiers = props.summary?.createdTiers ?? 0;
    const paymentMethods = props.summary?.createdPaymentMethods ?? 0;
    if (!tiers && !paymentMethods) return null;
    const parts: string[] = [];
    if (tiers) parts.push(t('importsPage.commit.entities.tiers', { count: tiers }, tiers));
    if (paymentMethods) parts.push(t('importsPage.commit.entities.paymentMethods', { count: paymentMethods }, paymentMethods));
    return t('importsPage.result.entitiesCreated', { list: parts.join(t('importsPage.commit.entities.and')) }, tiers + paymentMethods);
});

/** « 2 récurrences détectées » : seulement juste après le commit (la liste ci-dessous reste la référence). */
const detectedRecurrencesText = computed(() => {
    const detected = props.summary?.detectedRecurrences ?? 0;
    return detected ? t('importsPage.result.recurrencesDetected', { count: detected }, detected) : null;
});

const transactionsLink = computed(() => {
    const query: Record<string, string> = {};
    if (props.item.accountPublicId) query.account = props.item.accountPublicId;
    if (props.item.periodFrom) query.from = props.item.periodFrom;
    if (props.item.periodTo) query.to = props.item.periodTo;
    return { path: '/app/finances/transactions', query };
});

const templateDefaultName = computed(() => {
    const base = props.item.fileName.replace(/\.(csv|xlsx)$/i, '');
    return props.item.accountName ? `${props.item.accountName} · ${base}` : base;
});

async function confirmRevert() {
    localError.value = null;
    try {
        const result = await store.revertImport(props.item.publicId);
        notice.value = t('importsPage.result.reverted', { count: result.revertedTransactions }, result.revertedTransactions);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        revertOpen.value = false;
    }
}

async function confirmDelete() {
    localError.value = null;
    try {
        await store.deleteImport(props.item.publicId);
        deleteOpen.value = false;
        emit('deleted');
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        deleteOpen.value = false;
    }
}

function onTemplateSaved() {
    notice.value = t('importsPage.result.templateSaved');
}
</script>

<template>
    <section class="import-result">
        <AppAlert v-if="localError" type="error" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <AppAlert v-if="notice" type="success" closable @dismiss="notice = null">{{ notice }}</AppAlert>

        <div class="import-result__card" :class="isValid ? 'is-valid' : 'is-cancelled'">
            <span class="import-result__icon">
                <CircleCheckIcon v-if="isValid" :size="28" stroke-width="1.6" />
                <InfoCircleIcon v-else :size="28" stroke-width="1.6" />
            </span>
            <div class="import-result__body">
                <template v-if="isValid">
                    <h2 class="import-result__title">{{ t('importsPage.result.createdTitle', { count: created }, created) }}</h2>
                    <p class="import-result__text">
                        {{
                            t('importsPage.result.validatedOn', { date: formatImportTimestamp(item.validatedAt ?? item.updatedAt, locale) })
                        }}
                        <span v-if="item.counts.ignored">
                            · {{ t('importsPage.result.ignored', { count: item.counts.ignored }, item.counts.ignored) }}</span
                        >
                    </p>
                    <p v-if="createdEntitiesText" class="import-result__text">{{ createdEntitiesText }}</p>
                    <p v-if="detectedRecurrencesText" class="import-result__text">{{ detectedRecurrencesText }}</p>
                </template>
                <template v-else>
                    <h2 class="import-result__title">{{ t('importsPage.result.cancelledTitle') }}</h2>
                    <p class="import-result__text">{{ t('importsPage.result.cancelledBody') }}</p>
                </template>
            </div>
        </div>

        <div class="import-result__actions">
            <RouterLink v-if="isValid && item.accountPublicId" :to="transactionsLink" class="su-btn su-btn--ink">
                {{ t('importsPage.result.viewTransactions') }}
            </RouterLink>
            <button v-if="canSaveImportAsTemplate(item)" type="button" class="su-btn" :disabled="store.acting" @click="templateOpen = true">
                <TemplateIcon :size="16" stroke-width="1.6" />
                {{ t('importsPage.actions.saveAsTemplate') }}
            </button>
            <button
                v-if="canRevertImport(item)"
                type="button"
                class="su-btn su-btn--danger"
                :disabled="store.acting"
                @click="revertOpen = true"
            >
                <ArrowBackUpIcon :size="16" stroke-width="1.6" />
                {{ t('importsPage.actions.revert') }}
            </button>
            <button
                v-if="canDeleteImport(item)"
                type="button"
                class="su-btn su-btn--danger"
                :disabled="store.acting"
                @click="deleteOpen = true"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
                {{ t('importsPage.actions.delete') }}
            </button>
        </div>

        <RecurringSuggestionsPanel v-if="isValid" :import-public-id="item.publicId" hide-when-empty class="import-result__suggestions">
            <template #header="{ count }">
                <div>
                    <h3 class="import-result__subtitle">{{ t('importsPage.result.recurrencesTitle', { count }, count) }}</h3>
                    <p class="import-result__text">{{ t('importsPage.result.recurrencesHint') }}</p>
                </div>
            </template>
        </RecurringSuggestionsPanel>

        <AppConfirmationModal
            v-model="revertOpen"
            :title="t('importsPage.revertModal.title')"
            :message="`${t('importsPage.revertModal.body', { count: created }, created)} ${t('importsPage.revertModal.keepsEntities')}`"
            :confirm-label="t('importsPage.actions.revert')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmRevert"
        />
        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('importsPage.deleteModal.title')"
            :message="t('importsPage.deleteModal.body')"
            :confirm-label="t('importsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
        <ImportTemplateFormModal
            v-model="templateOpen"
            :import-public-id="item.publicId"
            :default-name="templateDefaultName"
            @saved="onTemplateSaved"
        />
    </section>
</template>

<style scoped>
.import-result {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 720px;
    padding: 8px 16px 16px;
}

.import-result__card {
    --tint: var(--ink-muted);
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--tint) 9%, transparent);
}

.import-result__card.is-valid {
    --tint: rgb(var(--v-theme-success));
}

.import-result__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--tint) 16%, transparent);
    color: var(--tint);
}

.import-result__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 680;
    letter-spacing: -0.02em;
}

.import-result__text {
    margin: 4px 0 0;
    font-size: 0.86rem;
    color: var(--ink-soft);
}

.import-result__suggestions {
    margin-top: 8px;
}

.import-result__subtitle {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.import-result__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.import-result__actions .su-btn {
    text-decoration: none;
}

@media (max-width: 767px) {
    .import-result {
        padding: 4px;
    }
}
</style>
