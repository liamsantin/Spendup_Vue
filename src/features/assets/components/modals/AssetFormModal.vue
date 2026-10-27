<script setup lang="ts">
/**
 * Création ou modification d’un actif.
 * L’édition ouvre par défaut les onglets Détails, Valorisations (sauf épargne adossée à un compte)
 * et, pour un véhicule, Relevés + Entretiens. `formOnly` limite la modale au formulaire : la fiche
 * page porte alors ces panneaux.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChartLineIcon, FileDescriptionIcon, GaugeIcon, ToolIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useUserSettingsStore } from '@/features/user-settings';
import { isAssetCurrency } from '@/features/assets/format';
import {
    assetToFormFields,
    buildCreateAssetPayload,
    buildUpdateAssetPayload,
    emptyAssetFormFields,
    isAssetFormDirty,
    type AssetFormFields,
    type AssetPayloadContext,
    type AssetPayloadErrorCode
} from '@/features/assets/payload';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset, AssetType } from '@/features/assets/types';
import AssetForm from '@/features/assets/components/forms/AssetForm.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';
import AssetValuationsPanel from '@/features/assets/components/panels/AssetValuationsPanel.vue';
import VehicleMaintenancesPanel from '@/features/assets/components/panels/VehicleMaintenancesPanel.vue';
import VehicleMileagesPanel from '@/features/assets/components/panels/VehicleMileagesPanel.vue';

type DetailTab = 'details' | 'valuations' | 'mileages' | 'maintenances';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        asset?: Asset | null;
        /** Type imposé à la création (ex. `immobilier` depuis la page Immobilier). */
        lockedType?: AssetType | null;
        /** Type présélectionné à la création (modifiable). */
        defaultType?: AssetType | null;
        /** Édition limitée au formulaire (valorisations et suivis véhicule restent sur la fiche). */
        formOnly?: boolean;
    }>(),
    { asset: null, lockedType: null, defaultType: null, formOnly: false }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [asset: Asset];
}>();

const { t } = useI18n();
const store = useAssetsStore();
const accountsStore = useAccountsStore();
const settings = useUserSettingsStore();

const isEditSession = ref(false);
const editAsset = ref<Asset | null>(null);
const activeTab = ref<DetailTab>('details');

const localError = ref<string | null>(null);
const fieldErrors = reactive<AssetFieldErrors>({});
const form = reactive<AssetFormFields>(emptyAssetFormFields());

const isEdit = computed(() => isEditSession.value || !!props.asset);
const tabbedEdit = computed(() => isEdit.value && !props.formOnly);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const liveAsset = computed(() => {
    const id = editAsset.value?.publicId;
    if (!id) return editAsset.value;
    return store.findByPublicId(id) ?? editAsset.value;
});

/* ── épargne adossée : comptes actifs dont l’utilisateur est propriétaire ── */

const linkableAccounts = computed(() => accountsStore.accounts.filter((item) => item.isOwned && item.isActive && item.myRole === 'owner'));

const allowedAccountIds = computed(() => {
    const ids = new Set(linkableAccounts.value.map((item) => item.publicId));
    const currentId = liveAsset.value?.savingsAccount?.accountPublicId;
    if (currentId) ids.add(currentId);
    return ids;
});

const accountItems = computed(() => {
    const items = linkableAccounts.value.map((item) => ({ title: item.name, value: item.publicId }));
    const currentId = form.savingsAccount.accountPublicId;
    if (currentId && !items.some((item) => item.value === currentId)) {
        const current = accountsStore.accounts.find((item) => item.publicId === currentId);
        items.unshift({ title: current?.name ?? currentId, value: currentId });
    }
    return [{ title: t('assetsPage.form.noAccount'), value: '' }, ...items];
});

/** Valeur masquée : épargne liée à un compte (la valeur saisie serait ignorée par l’API). */
const valueFromAccount = computed(() => form.type === 'compteEpargne' && !!form.savingsAccount.accountPublicId.trim());

/* ── en-tête et onglets ── */

const typeLocked = computed(() => isEdit.value || !!props.lockedType);

const currencyHint = computed(() =>
    isEdit.value
        ? t('assetsPage.form.currencyLockedHint')
        : t('assetsPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency })
);

const modalTitle = computed(() =>
    isEdit.value ? liveAsset.value?.name || t('assetsPage.form.editTitle') : t('assetsPage.form.createTitle')
);

const detailTabs = computed(() => {
    const asset = liveAsset.value;
    const tabs: { value: DetailTab; label: string; icon: typeof FileDescriptionIcon }[] = [
        { value: 'details', label: t('assetsPage.detail.tabs.details'), icon: FileDescriptionIcon }
    ];
    if (asset && !asset.isValueFromAccount) {
        tabs.push({ value: 'valuations', label: t('assetsPage.detail.tabs.valuations'), icon: ChartLineIcon });
    }
    if (asset?.type === 'vehicule') {
        tabs.push({ value: 'mileages', label: t('assetsPage.detail.tabs.mileages'), icon: GaugeIcon });
        tabs.push({ value: 'maintenances', label: t('assetsPage.detail.tabs.maintenances'), icon: ToolIcon });
    }
    return tabs;
});

const canSave = computed(() => {
    if (!isEdit.value || !editAsset.value) return true;
    return isAssetFormDirty(editAsset.value, form);
});

/* ── erreurs ── */

function clearFieldErrors() {
    for (const key of Object.keys(fieldErrors)) delete fieldErrors[key];
}

function applyPayloadError(code: AssetPayloadErrorCode, field?: string) {
    const message = t(`assetsPage.form.errors.${code}`);
    if (field) {
        fieldErrors[field] = message;
        return;
    }
    localError.value = message;
}

function resetForm() {
    localError.value = null;
    clearFieldErrors();
    const asset = editAsset.value;
    if (asset) {
        Object.assign(form, assetToFormFields(asset));
        return;
    }
    const currency = isAssetCurrency(settings.current.defaultCurrency) ? settings.current.defaultCurrency : '';
    Object.assign(form, emptyAssetFormFields({ type: props.lockedType ?? props.defaultType ?? '', currency }));
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEditSession.value = !!props.asset;
        editAsset.value = props.asset ?? null;
        activeTab.value = 'details';
        resetForm();
        if (!accountsStore.initialized) {
            void accountsStore.loadAccounts().catch(() => undefined);
        }
    },
    { immediate: true }
);

// Le détail rafraîchi (temps réel, valorisation…) met à jour la fiche sans écraser la saisie en cours.
watch(
    () => liveAsset.value,
    (asset) => {
        if (!asset || !editAsset.value || asset === editAsset.value) return;
        const dirty = isAssetFormDirty(editAsset.value, form);
        editAsset.value = asset;
        if (!dirty) Object.assign(form, assetToFormFields(asset));
    }
);

function payloadContext(): AssetPayloadContext {
    const asset = editAsset.value;
    return {
        lockedCurrency: asset?.currency ?? null,
        lockedType: asset?.type ?? props.lockedType ?? null,
        allowedAccountIds: allowedAccountIds.value,
        isValueFromAccount: valueFromAccount.value,
        currentEstimatedValue: asset?.estimatedValue ?? null
    };
}

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.value = null;
    clearFieldErrors();
    const ctx = payloadContext();
    const built = isEdit.value ? buildUpdateAssetPayload(form, ctx) : buildCreateAssetPayload(form, ctx);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        if (isEdit.value) activeTab.value = 'details';
        return;
    }
    try {
        const saved =
            isEdit.value && editAsset.value
                ? await store.updateAsset(editAsset.value.publicId, form, ctx)
                : await store.createAsset(form, ctx);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('assetsPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalTabs
        v-if="tabbedEdit"
        v-model="open"
        v-model:tab="activeTab"
        :title="modalTitle"
        :subtitle="t('assetsPage.form.subtitle')"
        :tabs="detailTabs"
        :height="760"
        :max-width="720"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <template #panel-details>
            <AppModalPanelScroll>
                <AssetForm
                    :form="form"
                    :is-edit="isEdit"
                    type-locked
                    :value-from-account="valueFromAccount"
                    :account-items="accountItems"
                    :field-errors="fieldErrors"
                    :currency-hint="currencyHint"
                />
            </AppModalPanelScroll>
        </template>

        <template #panel-valuations>
            <AppModalPanelScroll>
                <AssetValuationsPanel v-if="liveAsset" :asset="liveAsset" />
            </AppModalPanelScroll>
        </template>

        <template #panel-mileages>
            <AppModalPanelScroll>
                <VehicleMileagesPanel v-if="liveAsset" :asset="liveAsset" />
            </AppModalPanelScroll>
        </template>

        <template #panel-maintenances>
            <AppModalPanelScroll>
                <VehicleMaintenancesPanel v-if="liveAsset" :asset="liveAsset" />
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ activeTab === 'details' ? t('common.cancel') : t('common.close') }}
            </button>
            <button
                v-if="activeTab === 'details'"
                type="button"
                class="su-btn su-btn--ink"
                :disabled="store.acting || !canSave"
                @click="onSave"
            >
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalTabs>

    <AppModalBase
        v-else
        v-model="open"
        :title="modalTitle"
        :subtitle="t('assetsPage.form.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <AssetForm
            :form="form"
            :is-edit="isEdit"
            :type-locked="typeLocked"
            :allow-real-estate="lockedType === 'immobilier'"
            :value-from-account="valueFromAccount"
            :account-items="accountItems"
            :field-errors="fieldErrors"
            :currency-hint="currencyHint"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || (isEdit && !canSave)" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
