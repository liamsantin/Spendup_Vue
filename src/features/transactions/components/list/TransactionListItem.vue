<script setup lang="ts">
/**
 * Ligne d'opération façon horaire CFF : carré 36 px teinté | nom + sous-ligne grise | catégorie | montant.
 * Actions en `su-orb` au survol (desktop) et dans le menu « … » (mobile).
 */
import { computed, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsVerticalIcon, MinusIcon, PaperclipIcon, PencilIcon, PlusIcon, TrashIcon } from 'vue-tabler-icons';
import { useRowTap } from '@/components/shared/board/useRowTap';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { useTransactionRowDisplay } from '@/features/transactions/composables/useTransactionRowDisplay';
import { formatOperationDate } from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';
import TagChips from '@/features/tags/components/list/TagChips.vue';

const props = defineProps<{
    transaction: Transaction;
    canWrite: boolean;
    acting?: boolean;
    /** Relevés : afficher le sens du mouvement de ce compte (pas `movements[0]`). */
    statementAccountPublicId?: string | null;
    envelopeAction?: 'add' | 'remove' | null;
    /** Liste non groupée par jour : la date passe dans la sous-ligne. */
    showDate?: boolean;
}>();

const emit = defineEmits<{
    edit: [transaction: Transaction];
    delete: [transaction: Transaction];
    envelope: [transaction: Transaction];
}>();

const { t, locale } = useI18n();
const assetsStore = useAssetsStore();

const assetLabel = computed(() => {
    const id = props.transaction.assetPublicId?.trim();
    if (!id) return null;
    const asset = assetsStore.findByPublicId(id);
    if (!asset) return null;
    return t('transactionsPage.list.asset', { name: asset.name });
});

const {
    tileIcon,
    tileTint,
    tileStyle,
    categoryColor,
    amountText,
    amountTone,
    amountVariance,
    plannedAmountLabel,
    deltaAmountLabel,
    accountLine,
    isMine,
    authorLabel,
    categoryLabel,
    tierLabel
} = useTransactionRowDisplay(toRef(props, 'transaction'), toRef(props, 'statementAccountPublicId'));

/** Sous-ligne grise : compte · date (liste à plat) · origine · contrepartie · auteur (si autre). */
const subLine = computed(() => {
    const parts: string[] = [accountLine.value];
    if (props.showDate) parts.push(formatOperationDate(props.transaction.operationDate, locale.value));
    if (props.transaction.source === 'recurrence') parts.push(t('transactionsPage.list.sourceRecurrence'));
    else if (props.transaction.source === 'import') parts.push(t('transactionsPage.list.sourceImport'));
    if (tierLabel.value) parts.push(tierLabel.value);
    if (assetLabel.value) parts.push(assetLabel.value);
    if (!isMine.value) parts.push(authorLabel.value);
    return parts.join(' · ');
});

const hasSide = computed(() => !!categoryLabel.value || (props.canWrite && !props.acting));

const envelopeLabel = computed(() =>
    props.envelopeAction === 'add' ? t('transactionsPage.envelope.add') : t('transactionsPage.envelope.remove')
);

const tap = useRowTap(
    () => emit('edit', props.transaction),
    () => props.canWrite && !props.acting
);

function onDoubleClick(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.transaction);
}

function onActivate(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    emit('edit', props.transaction);
}
</script>

<template>
    <div
        class="transaction-list-item tx-row"
        :class="{ 'is-editable': canWrite && !acting }"
        :data-transaction-id="transaction.publicId"
        @click="onActivate"
        @dblclick="onDoubleClick"
        @touchstart.passive="tap.onTouchstart"
        @touchend="tap.onTouchend"
        @touchcancel="tap.onTouchcancel"
    >
        <span class="su-tile tx-row__tile" :class="[`su-tile--${tileTint}`]" :style="tileStyle" aria-hidden="true">
            <component :is="tileIcon" :size="18" stroke-width="1.7" />
        </span>

        <div class="tx-row__meta">
            <p class="tx-row__name">
                <span class="tx-row__label">{{ transaction.label }}</span>
                <span
                    v-if="transaction.files?.length"
                    class="tx-row__clip"
                    :title="t('transactionsPage.list.hasAttachments', { count: transaction.files.length }, transaction.files.length)"
                >
                    <PaperclipIcon :size="13" stroke-width="1.7" />
                    {{ transaction.files.length }}
                </span>
            </p>
            <p class="tx-row__sub">
                <span class="tx-row__sub-text">{{ subLine }}</span>
                <TagChips :tag-public-ids="transaction.tagPublicIds" compact class="tx-row__tags" />
            </p>
        </div>

        <div v-if="hasSide" class="tx-row__side" :class="{ 'has-category': !!categoryLabel }">
            <div v-if="canWrite" class="tx-row__orbs">
                <button
                    v-if="envelopeAction"
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="envelopeLabel"
                    :title="envelopeLabel"
                    @click.stop="emit('envelope', transaction)"
                >
                    <PlusIcon v-if="envelopeAction === 'add'" :size="16" stroke-width="1.6" />
                    <MinusIcon v-else :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.edit')"
                    :title="t('transactionsPage.actions.edit')"
                    @click.stop="emit('edit', transaction)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.delete')"
                    :title="t('transactionsPage.actions.delete')"
                    @click.stop="emit('delete', transaction)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
            <span v-if="categoryLabel" class="su-chip tx-row__category" :style="{ '--chip-color': categoryColor ?? 'var(--gray)' }">
                {{ categoryLabel }}
            </span>
        </div>

        <div class="tx-row__amounts">
            <span class="tx-row__amount" :class="amountTone">{{ amountText }}</span>
            <span
                v-if="amountVariance"
                class="tx-row__delta"
                :class="`is-${amountVariance.tone}`"
                :title="t('transactionsPage.list.recurrenceDelta', { delta: deltaAmountLabel, planned: plannedAmountLabel })"
            >
                {{ deltaAmountLabel }}
            </span>
        </div>

        <div v-if="canWrite" class="tx-row__more">
            <v-menu location="bottom end" :offset="4">
                <template #activator="{ props: menuProps }">
                    <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')" @click.stop>
                        <DotsVerticalIcon :size="18" stroke-width="1.7" />
                    </button>
                </template>
                <v-sheet elevation="0" class="su-menu tx-row-menu">
                    <button
                        v-if="envelopeAction"
                        type="button"
                        class="tx-row-menu__item"
                        :disabled="acting"
                        @click="emit('envelope', transaction)"
                    >
                        <PlusIcon v-if="envelopeAction === 'add'" :size="16" stroke-width="1.6" />
                        <MinusIcon v-else :size="16" stroke-width="1.6" />
                        {{ envelopeLabel }}
                    </button>
                    <button type="button" class="tx-row-menu__item" :disabled="acting" @click="emit('edit', transaction)">
                        <PencilIcon :size="16" stroke-width="1.6" />
                        {{ t('transactionsPage.actions.edit') }}
                    </button>
                    <button type="button" class="tx-row-menu__item is-danger" :disabled="acting" @click="emit('delete', transaction)">
                        <TrashIcon :size="16" stroke-width="1.6" />
                        {{ t('transactionsPage.actions.delete') }}
                    </button>
                </v-sheet>
            </v-menu>
        </div>
    </div>
</template>

<style scoped>
/* ── grille `36px | nom 1fr | catégorie | montant 120px`, filet fin entre les lignes ── */
.tx-row {
    position: relative;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto 120px;
    grid-template-areas: 'tile meta side amount';
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 60px;
    padding: 12px 8px;
    border: 0;
    border-radius: 0;
    background: transparent;
    cursor: default;
    transition: background 0.15s var(--ease);
}

.tx-row + .tx-row {
    border-top: 1px solid var(--line);
}

.tx-row.is-editable {
    cursor: pointer;
}

@media (hover: hover) {
    .tx-row:hover {
        background: var(--soft);
    }
}

.tx-row__tile {
    grid-area: tile;
    align-self: center;
}

/* teinte de catégorie : fond mélangé à 14 %, encre = couleur de la catégorie */
.tx-row__tile.su-tile--custom {
    background: color-mix(in srgb, var(--tile-color) 14%, transparent);
    color: var(--tile-color);
}

.tx-row__meta {
    grid-area: meta;
    min-width: 0;
}

.tx-row__name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
}

.tx-row__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tx-row__clip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex: none;
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
}

.tx-row__sub {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    min-width: 0;
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.3;
}

.tx-row__sub-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tx-row__side {
    grid-area: side;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
}

/* actions au survol : glissent à gauche de la catégorie sans décaler le montant */
.tx-row__orbs {
    display: flex;
    align-items: center;
    gap: 2px;
    width: 0;
    margin: 0;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.tx-row__orbs .su-orb {
    width: 36px;
    height: 36px;
}

.tx-row:hover .tx-row__orbs,
.tx-row:focus-within .tx-row__orbs {
    width: auto;
    margin-right: 12px;
    opacity: 1;
}

.tx-row__category {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tx-row__amounts {
    grid-area: amount;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 0;
}

/* montant 700 à droite : positif « + » bleu, négatif « − » noir */
.tx-row__amount {
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.tx-row__amount.is-credit {
    color: var(--blue-ink);
}

.tx-row__delta {
    font-size: 12px;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.tx-row__delta.is-favorable {
    color: var(--blue-ink);
}

.tx-row__delta.is-unfavorable {
    color: var(--violet-ink);
}

.tx-row__more {
    display: none;
    grid-area: more;
}

/* menu « … » : items 44 px, texte à gauche, suppression en rouge */
.tx-row-menu {
    display: flex;
    flex-direction: column;
    width: min(220px, calc(100vw - 32px));
}

.tx-row-menu__item {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 0 10px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.tx-row-menu__item + .tx-row-menu__item {
    border-top: 1px solid var(--line);
}

.tx-row-menu__item:hover:not(:disabled),
.tx-row-menu__item:focus-visible {
    background: var(--soft);
    outline: none;
}

.tx-row-menu__item.is-danger {
    color: var(--danger);
}

.tx-row-menu__item:disabled {
    opacity: 0.45;
    cursor: default;
}

@media (max-width: 767px) {
    /* mobile : catégorie sous le nom, menu « … » en bout de ligne, pas d'actions au survol */
    .tx-row {
        grid-template-columns: 36px minmax(0, 1fr) auto 40px;
        grid-template-areas:
            'tile meta amount more'
            'tile side side side';
        gap: 6px 12px;
        padding: 12px 0;
    }

    .tx-row__orbs {
        display: none;
    }

    .tx-row__side {
        justify-content: flex-start;
    }

    .tx-row__side:not(.has-category) {
        display: none;
    }

    .tx-row__more {
        display: grid;
        place-items: center;
    }

    .tx-row__category {
        max-width: 100%;
    }

    /* deux lignes seulement : nom, puis catégorie (ou compte · contrepartie si pas de catégorie) */
    .tx-row {
        row-gap: 2px;
        padding: 10px 0;
    }

    .tx-row:has(.tx-row__side.has-category) .tx-row__sub {
        display: none;
    }

    .tx-row__tags {
        display: none;
    }

    .tx-row__tile {
        align-self: center;
    }
}
</style>
