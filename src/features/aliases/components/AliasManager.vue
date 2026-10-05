<script setup lang="ts">
/**
 * Onglet « Alias » d’un tier ou d’un moyen de paiement : CRUD des alias de reconnaissance à l’import.
 * Chaque action part tout de suite (indépendante du bouton Enregistrer de la fiche).
 * Un changement ne s’applique qu’à la prochaine analyse d’un import.
 * Mode `draft` (création : l’entité n’existe pas encore) : les alias restent locaux et sont
 * remontés via `update:drafts` pour être créés par la modale après l’enregistrement.
 */
defineOptions({ name: 'AliasManager' });

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { InfoCircleIcon, PencilIcon, PlusIcon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useNotificationsStore } from '@/features/notifications';
import { aliasesApi } from '@/features/aliases/api';
import {
    aliasToFormFields,
    buildAliasPayload,
    emptyAliasFormFields,
    type AliasFormFields,
    type AliasPayloadErrorCode
} from '@/features/aliases/payload';
import {
    ALIAS_BASIC_MATCH_TYPES,
    ALIAS_MATCH_TYPES,
    ALIAS_PRIORITY_MAX,
    ALIAS_PRIORITY_MIN,
    ALIAS_VALUE_MAX,
    type Alias,
    type AliasTarget,
    type UpdateAliasPayload
} from '@/features/aliases/types';

const props = defineProps<{
    target: AliasTarget;
    ownerPublicId?: string;
    /** Création : pas de propriétaire, les alias sont conservés localement. */
    draft?: boolean;
    drafts?: UpdateAliasPayload[];
    /** Moyen de paiement : compte du moyen, pour l’écoute `accountChanged`. */
    accountPublicId?: string | null;
    readonly?: boolean;
}>();

const emit = defineEmits<{
    /** Nombre d’alias listés (pastille de l’onglet). */
    count: [value: number];
    'update:drafts': [value: UpdateAliasPayload[]];
}>();

const { t } = useI18n();
const notifications = useNotificationsStore();

const items = ref<Alias[]>([]);
const loading = ref(false);
const acting = ref(false);
const localError = ref<string | null>(null);
const fieldErrors = reactive<{ value: string | null; priority: string | null }>({ value: null, priority: null });
const form = reactive<AliasFormFields>(emptyAliasFormFields());
const editing = ref<Alias | null>(null);
const advanced = ref(false);
const pendingDelete = ref<Alias | null>(null);
let draftSeq = 0;

function draftToAlias(payload: UpdateAliasPayload, publicId = `draft-${++draftSeq}`): Alias {
    return { publicId, ...payload, createdByImport: false, createdAt: '', updatedAt: null };
}

function commitDrafts() {
    emit(
        'update:drafts',
        items.value.map(({ value, matchType, priority, isActive }) => ({ value, matchType, priority, isActive }))
    );
    emit('count', items.value.length);
}

const deleteOpen = computed({
    get: () => !!pendingDelete.value,
    set: (value: boolean) => {
        if (!value) pendingDelete.value = null;
    }
});

const matchTypeItems = computed(() =>
    (advanced.value || form.matchType === 'regex' ? ALIAS_MATCH_TYPES : ALIAS_BASIC_MATCH_TYPES).map((value) => ({
        title: t(`aliases.matchTypes.${value}`),
        value
    }))
);

function matchTypeLabel(alias: Alias) {
    return t(`aliases.matchTypes.${alias.matchType}`);
}

async function load() {
    if (props.draft || !props.ownerPublicId) return;
    loading.value = true;
    try {
        items.value = (await aliasesApi.list(props.target, props.ownerPublicId)).items;
        emit('count', items.value.length);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

function resetForm() {
    Object.assign(form, emptyAliasFormFields());
    editing.value = null;
    advanced.value = false;
    fieldErrors.value = null;
    fieldErrors.priority = null;
}

function startEdit(alias: Alias) {
    Object.assign(form, aliasToFormFields(alias));
    editing.value = alias;
    advanced.value = alias.matchType === 'regex' || alias.priority !== 0;
    fieldErrors.value = null;
    fieldErrors.priority = null;
    localError.value = null;
}

function payloadErrorText(code: AliasPayloadErrorCode) {
    return t(`aliases.errors.${code}`, { max: ALIAS_VALUE_MAX, min: ALIAS_PRIORITY_MIN, maxPriority: ALIAS_PRIORITY_MAX });
}

async function run(action: () => Promise<void>) {
    acting.value = true;
    localError.value = null;
    try {
        await action();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

function onSubmit() {
    fieldErrors.value = null;
    fieldErrors.priority = null;
    const built = buildAliasPayload(form);
    if (!built.ok) {
        if (built.field === 'priority') fieldErrors.priority = payloadErrorText(built.code);
        else fieldErrors.value = payloadErrorText(built.code);
        return;
    }
    const current = editing.value;
    if (props.draft) {
        const duplicate = items.value.some(
            (a) =>
                a.publicId !== current?.publicId &&
                a.value.toLowerCase() === built.payload.value.toLowerCase() &&
                a.matchType === built.payload.matchType
        );
        if (duplicate) {
            fieldErrors.value = t('aliases.errors.duplicateDraft');
            return;
        }
        items.value = current
            ? items.value.map((a) => (a.publicId === current.publicId ? draftToAlias(built.payload, a.publicId) : a))
            : [...items.value, draftToAlias(built.payload)];
        resetForm();
        commitDrafts();
        return;
    }
    const ownerId = props.ownerPublicId!;
    void run(async () => {
        if (current) await aliasesApi.update(props.target, ownerId, current.publicId, built.payload);
        else await aliasesApi.create(props.target, ownerId, built.payload);
        resetForm();
        await load();
    });
}

function toggleActive(alias: Alias, isActive: boolean | null) {
    if (props.draft) {
        items.value = items.value.map((a) => (a.publicId === alias.publicId ? { ...a, isActive: !!isActive } : a));
        commitDrafts();
        return;
    }
    const ownerId = props.ownerPublicId!;
    void run(async () => {
        await aliasesApi.update(props.target, ownerId, alias.publicId, {
            value: alias.value,
            matchType: alias.matchType,
            priority: alias.priority,
            isActive: !!isActive
        });
        await load();
    });
}

function confirmDelete() {
    const alias = pendingDelete.value;
    pendingDelete.value = null;
    if (!alias) return;
    if (props.draft) {
        items.value = items.value.filter((a) => a.publicId !== alias.publicId);
        if (editing.value?.publicId === alias.publicId) resetForm();
        commitDrafts();
        return;
    }
    const ownerId = props.ownerPublicId!;
    void run(async () => {
        await aliasesApi.remove(props.target, ownerId, alias.publicId);
        if (editing.value?.publicId === alias.publicId) resetForm();
        await load();
    });
}

// Sync multi-onglets : `tierUpdated` / `paymentMethodUpdated` à chaque changement d’alias.
const unsubscribe = props.draft
    ? () => {}
    : props.target === 'tier'
      ? notifications.subscribeToTierChanged((payload) => {
            if (payload.change === 'tierUpdated' && payload.tierPublicId === props.ownerPublicId) void load();
        })
      : notifications.subscribeToAccountChanged((payload) => {
            if (payload.change === 'paymentMethodUpdated' && payload.accountPublicId === props.accountPublicId) void load();
        });
onBeforeUnmount(unsubscribe);

watch(
    () => [props.ownerPublicId, props.draft],
    () => {
        items.value = props.draft ? (props.drafts ?? []).map((d) => draftToAlias(d)) : [];
        localError.value = null;
        resetForm();
        void load();
    },
    { immediate: true }
);
</script>

<template>
    <section class="alias-manager">
        <div class="alias-manager__head">
            <p class="alias-manager__section">{{ t('aliases.title') }}</p>
            <InfoCircleIcon
                class="alias-manager__info"
                :size="15"
                stroke-width="1.8"
                role="img"
                :aria-label="t(`aliases.helpDetails.${target}`)"
                :title="t(`aliases.helpDetails.${target}`)"
            />
        </div>
        <p class="alias-manager__help">{{ t(`aliases.help.${target}`) }}</p>

        <AppAlert v-if="localError" type="error" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div v-if="loading && !items.length" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="!items.length" class="alias-manager__empty">{{ t('aliases.empty') }}</p>
        <ul v-else class="alias-manager__list">
            <li
                v-for="alias in items"
                :key="alias.publicId"
                class="alias-manager__item"
                :class="{ 'is-inactive': !alias.isActive, 'is-editing': editing?.publicId === alias.publicId }"
            >
                <div class="alias-manager__main">
                    <span class="alias-manager__value" :title="alias.value">{{ alias.value }}</span>
                    <span class="alias-manager__meta">
                        <span class="alias-manager__tag">{{ matchTypeLabel(alias) }}</span>
                        <span v-if="alias.createdByImport" class="alias-manager__tag is-auto" :title="t('aliases.autoHint')">
                            {{ t('aliases.auto') }}
                        </span>
                        <span v-if="alias.priority !== 0" class="alias-manager__tag">
                            {{ t('aliases.priorityShort', { n: alias.priority }) }}
                        </span>
                    </span>
                </div>
                <div v-if="!readonly" class="alias-manager__actions">
                    <AppSwitch
                        :model-value="alias.isActive"
                        :disabled="acting"
                        :aria-label="t('aliases.active')"
                        :title="alias.isActive ? t('aliases.active') : t('aliases.inactive')"
                        @update:model-value="toggleActive(alias, $event)"
                    />
                    <button
                        type="button"
                        class="su-btn su-btn--ghost alias-manager__icon"
                        :disabled="acting"
                        :aria-label="t('aliases.edit')"
                        :title="t('aliases.edit')"
                        @click="startEdit(alias)"
                    >
                        <PencilIcon :size="16" stroke-width="1.6" />
                    </button>
                    <button
                        type="button"
                        class="su-btn su-btn--ghost alias-manager__icon"
                        :disabled="acting"
                        :aria-label="t('aliases.delete')"
                        :title="t('aliases.delete')"
                        @click="pendingDelete = alias"
                    >
                        <TrashIcon :size="16" stroke-width="1.6" />
                    </button>
                </div>
                <span v-else-if="!alias.isActive" class="alias-manager__tag">{{ t('aliases.inactive') }}</span>
            </li>
        </ul>

        <form v-if="!readonly" class="alias-manager__form" @submit.prevent="onSubmit">
            <div class="alias-manager__row">
                <v-text-field
                    v-model="form.value"
                    class="alias-manager__input"
                    :label="editing ? t('aliases.editValue') : t('aliases.newValue')"
                    :placeholder="t('aliases.valuePlaceholder')"
                    :maxlength="ALIAS_VALUE_MAX"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    :error-messages="fieldErrors.value ?? undefined"
                    :disabled="acting"
                />
                <AppSelect
                    v-model="form.matchType"
                    class="alias-manager__type"
                    :items="matchTypeItems"
                    :label="t('aliases.matchType')"
                    float-label
                    hide-details
                    :disabled="acting"
                />
            </div>
            <p v-if="form.matchType !== 'exact'" class="alias-manager__hint">{{ t(`aliases.matchTypeHints.${form.matchType}`) }}</p>

            <div v-if="advanced" class="alias-manager__row">
                <v-text-field
                    v-model="form.priority"
                    class="alias-manager__priority"
                    :label="t('aliases.priority')"
                    :hint="t('aliases.priorityHint', { min: ALIAS_PRIORITY_MIN, max: ALIAS_PRIORITY_MAX })"
                    persistent-hint
                    inputmode="numeric"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error-messages="fieldErrors.priority ?? undefined"
                    :disabled="acting"
                />
            </div>

            <div class="alias-manager__footer">
                <button v-if="!advanced" type="button" class="alias-manager__link" @click="advanced = true">
                    {{ t('aliases.advanced') }}
                </button>
                <span v-else />
                <div class="alias-manager__buttons">
                    <button v-if="editing" type="button" class="su-btn su-btn--ghost" :disabled="acting" @click="resetForm">
                        {{ t('common.cancel') }}
                    </button>
                    <button type="submit" class="su-btn su-btn--tonal" :disabled="acting || !form.value.trim()">
                        <span v-if="acting" class="su-spin" />
                        <PlusIcon v-else-if="!editing" :size="16" stroke-width="1.6" />
                        {{ editing ? t('aliases.update') : t('aliases.add') }}
                    </button>
                </div>
            </div>
        </form>

        <p class="alias-manager__note">{{ t('aliases.nextAnalysis') }}</p>

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('aliases.deleteConfirm.title')"
            :message="t('aliases.deleteConfirm.body', { value: pendingDelete?.value ?? '' })"
            :confirm-label="t('aliases.delete')"
            confirm-color="error"
            @confirm="confirmDelete"
        />
    </section>
</template>

<style scoped>
.alias-manager {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.alias-manager__head {
    display: flex;
    align-items: center;
    gap: 6px;
}

.alias-manager__info {
    flex: none;
    color: var(--ink-muted);
    cursor: help;
}

.alias-manager__section {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.alias-manager__help,
.alias-manager__hint,
.alias-manager__note,
.alias-manager__empty {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.alias-manager__hint {
    margin-top: -4px;
}

.alias-manager__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.alias-manager__item {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    padding: 8px 10px 8px 12px;
    border-radius: 12px;
    background: var(--hair, rgba(16, 16, 20, 0.04));
}

.alias-manager__item.is-inactive .alias-manager__value {
    color: var(--ink-muted);
    text-decoration: line-through;
}

.alias-manager__item.is-editing {
    outline: 1.5px solid rgb(var(--v-theme-primary));
}

.alias-manager__main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.alias-manager__value {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.alias-manager__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.alias-manager__tag {
    --tint: var(--ink-muted);
    padding: 1px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: var(--tint);
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
}

.alias-manager__tag.is-auto {
    --tint: rgb(var(--v-theme-primary));
}

.alias-manager__actions {
    display: flex;
    flex: none;
    gap: 2px;
    align-items: center;
}

.alias-manager__icon {
    padding-inline: 8px;
}

.alias-manager__form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.alias-manager__row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
}

.alias-manager__input {
    flex: 1 1 220px;
    min-width: 0;
}

.alias-manager__type {
    flex: 0 1 190px;
    min-width: 160px;
}

.alias-manager__priority {
    flex: 0 1 190px;
}

.alias-manager__footer {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
}

.alias-manager__buttons {
    display: flex;
    gap: 8px;
}

.alias-manager__link {
    padding: 0;
    border: 0;
    background: none;
    color: rgb(var(--v-theme-primary));
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}

@media (max-width: 599px) {
    .alias-manager__type,
    .alias-manager__priority {
        flex: 1 1 100%;
    }
}
</style>
