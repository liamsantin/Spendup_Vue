<script setup lang="ts">
/**
 * Bloc actif (grille de l’annuaire) : carré 36 px teinté par type + menu, nom 700, sous-ligne
 * « type · détail court », valeur 700 avec devise en petit gris, date de dernière valorisation
 * et mention « cédé » pour un actif inactif.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { assetTypeIcon, assetTypeTile, formatAssetAmount, formatCalendarDate, formatCryptoQuantity } from '@/features/assets/format';
import type { Asset } from '@/features/assets/types';

const props = defineProps<{
    asset: Asset;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [asset: Asset];
    delete: [asset: Asset];
}>();

const { t, locale } = useI18n();

const tileClass = computed(() => assetTypeTile(props.asset.type));
const icon = computed(() => assetTypeIcon(props.asset.type));
const sold = computed(() => !props.asset.isActive);

/** Détail court selon le type (marque / modèle, quantité, type d’objet…). */
const shortDetail = computed(() => {
    const asset = props.asset;
    if (asset.vehicle) return [asset.vehicle.brand, asset.vehicle.model].filter(Boolean).join(' ');
    if (asset.crypto) {
        return t('assetsPage.list.quantity', {
            quantity: formatCryptoQuantity(asset.crypto.quantity, locale.value),
            symbol: asset.crypto.symbol
        });
    }
    if (asset.valuableItem) {
        const type = t(`assetsPage.valuableItemTypes.${asset.valuableItem.itemType}`);
        return [type, asset.valuableItem.brand].filter(Boolean).join(' ');
    }
    if (asset.savingsAccount) return t(`assetsPage.savingsTypes.${asset.savingsAccount.savingsType}`);
    if (asset.realEstate) {
        const details = asset.realEstate.details;
        return [t(`assetsPage.propertyTypes.${details.propertyType}`), details.city].filter(Boolean).join(' ');
    }
    if (asset.other?.customType) return asset.other.customType;
    return '';
});

const subLine = computed(() => [t(`assetsPage.types.${props.asset.type}`), shortDetail.value].filter(Boolean).join(' · '));
const valueText = computed(() => formatAssetAmount(props.asset.estimatedValue));

const valuationText = computed(() => {
    if (props.asset.isValueFromAccount) return t('assetsPage.list.valueFromAccount');
    if (!props.asset.lastValuationDate) return t('assetsPage.list.noValuation');
    return t('assetsPage.list.lastValuation', { date: formatCalendarDate(props.asset.lastValuationDate, locale.value) });
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.asset);
}
</script>

<template>
    <article
        class="asset-card"
        :class="{ 'asset-card--editable': !acting, 'is-sold': sold }"
        :data-asset-id="asset.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('edit', asset)"
    >
        <div class="asset-card__head">
            <span class="su-tile" :class="tileClass" aria-hidden="true">
                <component :is="icon" :size="18" stroke-width="1.6" />
            </span>
            <div class="asset-card__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu asset-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', asset)">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('assetsPage.actions.edit') }}</span>
                        </button>
                        <button
                            type="button"
                            class="su-menu-item asset-actions-menu__delete"
                            :disabled="acting"
                            @click="emit('delete', asset)"
                        >
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('assetsPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <h3 class="asset-card__name">{{ asset.name }}</h3>
        <p class="asset-card__sub">{{ subLine }}</p>
        <p class="asset-card__value">
            {{ valueText }} <small>{{ asset.currency }}</small>
        </p>
        <div class="asset-card__foot">
            <span>{{ valuationText }}</span>
            <span v-if="sold" class="asset-card__sold">{{ t('assetsPage.list.sold') }}</span>
        </div>
    </article>
</template>

<style scoped>
/* bloc léger : bordure fine, pas d'ombre ; noircit au survol */
.asset-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 18px 20px 16px;
    border: 1px solid var(--line);
    background: var(--bg);
    transition: border-color 0.15s var(--ease);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.asset-card--editable {
    cursor: pointer;
}

.asset-card--editable:hover,
.asset-card:focus-within {
    border-color: var(--ink);
}

.asset-card:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.asset-card.is-sold > :not(.asset-card__head):not(.asset-card__foot) {
    opacity: 0.55;
}

.asset-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 36px;
}

.asset-card__actions {
    display: flex;
    margin: -4px -8px -4px 0;
}

@media (hover: hover) and (pointer: fine) {
    .asset-card__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .asset-card:hover .asset-card__actions,
    .asset-card:focus-within .asset-card__actions {
        opacity: 1;
    }
}

.asset-card__name {
    margin: 14px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.asset-card__sub {
    margin: 2px 0 0;
    min-height: 1.35em;
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.asset-card__value {
    margin: 16px 0 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    white-space: nowrap;
}

.asset-card__value small {
    color: var(--gray);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0;
}

.asset-card__foot {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    color: var(--gray);
    font-size: 13px;
}

.asset-card__sold {
    flex: none;
    color: var(--ink);
    font-weight: 700;
}

.asset-actions-menu {
    width: min(240px, calc(100vw - 32px));
}

.asset-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.asset-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.asset-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}
</style>
