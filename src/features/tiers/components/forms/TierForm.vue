<script setup lang="ts">
/**
 * Champs du formulaire tier. `form` est détenu par le parent.
 * Un seul volet affiché, commuté par le sélecteur de nature.
 * Mise en page modale Swiss : libellé 170 px à gauche | champ carré à droite.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TierForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { todayUtcYmd } from '@/features/tiers/format';
import { TIER_NATURE_ICONS, tierNatureTileClass } from '@/features/tiers/natureUi';
import {
    TIER_COMPANY_IDENTIFIER_MAX,
    TIER_COMPANY_LEGAL_NAME_MAX,
    TIER_EMAIL_MAX,
    TIER_NAME_MAX,
    TIER_NOTES_MAX,
    TIER_ORGANIZATION_NAME_MAX,
    TIER_ORGANIZATION_TYPE_MAX,
    TIER_PERSON_NAME_MAX,
    TIER_PHONE_MAX,
    TIER_ROLES,
    type TierNature,
    type TierRole
} from '@/features/tiers/types';
import type { TierFormFields } from '@/features/tiers/payload';

export type TierFormFieldErrors = {
    name?: string | null;
    nature?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    notes?: string | null;
    roles?: string | null;
    'person.firstName'?: string | null;
    'person.lastName'?: string | null;
    'person.birthDate'?: string | null;
    'company.legalName'?: string | null;
    'company.vatNumber'?: string | null;
    'company.companyRegistrationNumber'?: string | null;
    'organization.officialName'?: string | null;
    'organization.organizationType'?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: TierFormFields;
        isEdit: boolean;
        natureItems: { title: string; value: TierNature }[];
        fieldErrors?: TierFormFieldErrors;
        natureHint?: string | null;
        /** À la création, la nature est déjà choisie : pas de sélecteur. */
        lockNature?: boolean;
        /** Les rôles ne sont pas demandés à la création. */
        showRoles?: boolean;
        /** Page Banques : nature et rôles imposés (entreprise, rôle « Banque ») et non affichés. */
        lockIdentity?: boolean;
    }>(),
    {
        fieldErrors: () => ({}),
        natureHint: null,
        lockNature: false,
        showRoles: true,
        lockIdentity: false
    }
);

const emit = defineEmits<{
    'change-nature': [];
}>();

const { t } = useI18n();

const todayUtc = computed(() => todayUtcYmd());
const panelTitle = computed(() => {
    switch (props.form.nature) {
        case 'person':
            return t('tiersPage.form.sections.person');
        case 'company':
            return t('tiersPage.form.sections.company');
        case 'organization':
            return t('tiersPage.form.sections.organization');
        default:
            return null;
    }
});

const natureTileClass = computed(() => tierNatureTileClass(props.form.nature));

const birthDateModel = computed({
    get: () => props.form.person.birthDate,
    set: (value: string | null) => {
        props.form.person.birthDate = value;
    }
});

/** Un tier avec volet banque porte toujours le rôle `banque` : la puce est cochée et figée. */
function isRoleLocked(role: TierRole): boolean {
    return role === 'banque' && props.form.bank.enabled;
}

function hasRole(role: TierRole): boolean {
    return isRoleLocked(role) || props.form.roles.includes(role);
}

function toggleRole(role: TierRole) {
    if (isRoleLocked(role)) return;
    if (hasRole(role)) {
        props.form.roles = props.form.roles.filter((item) => item !== role);
        return;
    }
    props.form.roles = TIER_ROLES.filter((item) => item === role || props.form.roles.includes(item));
}
</script>

<template>
    <div class="tier-form">
        <h2 class="tier-form__section">{{ t('tiersPage.form.sections.identity') }}</h2>

        <div class="tier-form__row">
            <label class="tier-form__label" for="tier-form-name">
                {{ t('tiersPage.form.fields.name') }} <span class="tier-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tier-form__field">
                <v-text-field
                    id="tier-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    :maxlength="TIER_NAME_MAX"
                    :placeholder="t(`tiersPage.form.placeholders.nameByNature.${form.nature}`)"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </div>
        </div>

        <div v-if="lockNature && !lockIdentity" class="tier-form__row">
            <span class="tier-form__label">{{ t('tiersPage.form.fields.nature') }}</span>
            <div class="tier-form__field tier-form__nature-lock">
                <span class="tier-form__nature-tile" :class="natureTileClass" aria-hidden="true">
                    <component :is="TIER_NATURE_ICONS[form.nature]" :size="18" stroke-width="1.7" />
                </span>
                <span class="tier-form__nature-name">{{ t(`tiersPage.natures.${form.nature}`) }}</span>
                <button type="button" class="su-btn su-btn--ghost su-btn--sm" @click="emit('change-nature')">
                    {{ t('tiersPage.form.changeNature') }}
                </button>
            </div>
        </div>
        <div v-else-if="!lockIdentity" class="tier-form__row">
            <label class="tier-form__label" for="tier-form-nature">
                {{ t('tiersPage.form.fields.nature') }} <span class="tier-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tier-form__field">
                <AppSelect
                    id="tier-form-nature"
                    v-model="form.nature"
                    :items="natureItems"
                    :label="t('tiersPage.form.fields.nature')"
                    hide-details="auto"
                    :error="!!fieldErrors.nature"
                    :error-messages="fieldErrors.nature || undefined"
                    :hint="natureHint || undefined"
                    :persistent-hint="!!natureHint"
                />
            </div>
        </div>

        <div v-if="showRoles && !lockIdentity" class="tier-form__row tier-form__row--top">
            <span class="tier-form__label">{{ t('tiersPage.form.fields.roles') }}</span>
            <div class="tier-form__field">
                <div class="tier-form__roles" role="group" :aria-label="t('tiersPage.form.fields.roles')">
                    <button
                        v-for="role in TIER_ROLES"
                        :key="role"
                        type="button"
                        class="tier-form__role"
                        :class="{ 'is-selected': hasRole(role) }"
                        :aria-pressed="hasRole(role)"
                        :disabled="isRoleLocked(role)"
                        :title="isRoleLocked(role) ? t('tiersPage.form.bankRoleLocked') : undefined"
                        @click="toggleRole(role)"
                    >
                        <CheckIcon v-if="hasRole(role)" :size="13" stroke-width="2.4" />
                        {{ t(`tiersPage.roles.${role}`) }}
                    </button>
                </div>
                <p v-if="fieldErrors.roles" class="tier-form__note tier-form__note--error">{{ fieldErrors.roles }}</p>
                <p v-else-if="form.roles.includes('banque') && !form.bank.enabled" class="tier-form__note tier-form__note--warn">
                    {{ t('tiersPage.form.bankRoleWithoutPanel') }}
                </p>
                <p v-else class="tier-form__note">{{ t('tiersPage.form.rolesHint') }}</p>
            </div>
        </div>

        <template v-if="panelTitle">
            <h2 class="tier-form__section">{{ panelTitle }}</h2>

            <template v-if="form.nature === 'person'">
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-first-name">{{ t('tiersPage.form.fields.firstName') }}</label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-first-name"
                            v-model="form.person.firstName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_PERSON_NAME_MAX"
                            :error="!!fieldErrors['person.firstName']"
                            :error-messages="fieldErrors['person.firstName'] || undefined"
                        />
                    </div>
                </div>
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-last-name">{{ t('tiersPage.form.fields.lastName') }}</label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-last-name"
                            v-model="form.person.lastName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_PERSON_NAME_MAX"
                            :error="!!fieldErrors['person.lastName']"
                            :error-messages="fieldErrors['person.lastName'] || undefined"
                        />
                    </div>
                </div>
                <div class="tier-form__row">
                    <span class="tier-form__label">{{ t('tiersPage.form.fields.birthDate') }}</span>
                    <div class="tier-form__field">
                        <AppDatePicker
                            v-model="birthDateModel"
                            color="primary"
                            hide-details="auto"
                            :max="todayUtc"
                            :placeholder="t('tiersPage.form.placeholders.birthDate')"
                        />
                        <p v-if="fieldErrors['person.birthDate']" class="tier-form__note tier-form__note--error">
                            {{ fieldErrors['person.birthDate'] }}
                        </p>
                    </div>
                </div>
            </template>

            <template v-else-if="form.nature === 'company'">
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-legal-name">{{ t('tiersPage.form.fields.legalName') }}</label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-legal-name"
                            v-model="form.company.legalName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_COMPANY_LEGAL_NAME_MAX"
                            :error="!!fieldErrors['company.legalName']"
                            :error-messages="fieldErrors['company.legalName'] || undefined"
                        />
                    </div>
                </div>
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-vat">{{ t('tiersPage.form.fields.vatNumber') }}</label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-vat"
                            v-model="form.company.vatNumber"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_COMPANY_IDENTIFIER_MAX"
                            :placeholder="t('tiersPage.form.placeholders.vatNumber')"
                            :error="!!fieldErrors['company.vatNumber']"
                            :error-messages="fieldErrors['company.vatNumber'] || undefined"
                        />
                    </div>
                </div>
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-registration">
                        {{ t('tiersPage.form.fields.companyRegistrationNumber') }}
                    </label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-registration"
                            v-model="form.company.companyRegistrationNumber"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_COMPANY_IDENTIFIER_MAX"
                            :placeholder="t('tiersPage.form.placeholders.companyRegistrationNumber')"
                            :error="!!fieldErrors['company.companyRegistrationNumber']"
                            :error-messages="fieldErrors['company.companyRegistrationNumber'] || undefined"
                        />
                    </div>
                </div>
            </template>

            <template v-else-if="form.nature === 'organization'">
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-official-name">{{ t('tiersPage.form.fields.officialName') }}</label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-official-name"
                            v-model="form.organization.officialName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_ORGANIZATION_NAME_MAX"
                            :error="!!fieldErrors['organization.officialName']"
                            :error-messages="fieldErrors['organization.officialName'] || undefined"
                        />
                    </div>
                </div>
                <div class="tier-form__row">
                    <label class="tier-form__label" for="tier-form-organization-type">
                        {{ t('tiersPage.form.fields.organizationType') }}
                    </label>
                    <div class="tier-form__field">
                        <v-text-field
                            id="tier-form-organization-type"
                            v-model="form.organization.organizationType"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :maxlength="TIER_ORGANIZATION_TYPE_MAX"
                            :placeholder="t('tiersPage.form.placeholders.organizationType')"
                            :error="!!fieldErrors['organization.organizationType']"
                            :error-messages="fieldErrors['organization.organizationType'] || undefined"
                        />
                    </div>
                </div>
            </template>
        </template>

        <h2 class="tier-form__section">{{ t('tiersPage.form.sections.contact') }}</h2>
        <div class="tier-form__row">
            <label class="tier-form__label" for="tier-form-email">{{ t('tiersPage.form.fields.email') }}</label>
            <div class="tier-form__field">
                <v-text-field
                    id="tier-form-email"
                    v-model="form.email"
                    type="email"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    inputmode="email"
                    :maxlength="TIER_EMAIL_MAX"
                    :placeholder="t('tiersPage.form.placeholders.email')"
                    :error="!!fieldErrors.email"
                    :error-messages="fieldErrors.email || undefined"
                />
            </div>
        </div>
        <div class="tier-form__row">
            <label class="tier-form__label" for="tier-form-phone">{{ t('tiersPage.form.fields.phone') }}</label>
            <div class="tier-form__field">
                <v-text-field
                    id="tier-form-phone"
                    v-model="form.phone"
                    type="tel"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    inputmode="tel"
                    :maxlength="TIER_PHONE_MAX"
                    :placeholder="t('tiersPage.form.placeholders.phone')"
                    :error="!!fieldErrors.phone"
                    :error-messages="fieldErrors.phone || undefined"
                />
            </div>
        </div>
        <div class="tier-form__row">
            <label class="tier-form__label" for="tier-form-website">{{ t('tiersPage.form.fields.website') }}</label>
            <div class="tier-form__field">
                <v-text-field
                    id="tier-form-website"
                    v-model="form.website"
                    type="url"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    inputmode="url"
                    :placeholder="t('tiersPage.form.placeholders.website')"
                    :error="!!fieldErrors.website"
                    :error-messages="fieldErrors.website || undefined"
                />
            </div>
        </div>
        <div class="tier-form__row tier-form__row--top">
            <label class="tier-form__label" for="tier-form-notes">{{ t('tiersPage.form.fields.notes') }}</label>
            <div class="tier-form__field">
                <v-textarea
                    id="tier-form-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :maxlength="TIER_NOTES_MAX"
                    :placeholder="t('tiersPage.form.placeholders.notes')"
                    :error="!!fieldErrors.notes"
                    :error-messages="fieldErrors.notes || undefined"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.tier-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* titre de section : 16 px 700 sur filet 2 px (le premier s’appuie sur le filet de l’en-tête) */
.tier-form__section {
    margin: 20px 0 4px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
}

.tier-form__section:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
}

/* ligne libellé 170 px | champ */
.tier-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.tier-form__row--top {
    align-items: start;
}

.tier-form__row--top .tier-form__label {
    padding-top: 10px;
}

.tier-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.tier-form__req {
    color: var(--blue-ink);
}

.tier-form__field {
    min-width: 0;
}

.tier-form__note {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--gray);
    line-height: 1.4;
}

.tier-form__note--error {
    color: var(--danger);
}

.tier-form__note--warn {
    color: var(--violet-ink);
}

/* nature figée : carré teinté + libellé + « Changer » */
.tier-form__nature-lock {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.tier-form__nature-tile {
    flex: none;
}

.tier-form__nature-name {
    font-weight: 700;
}

/* rôles : cases carrées à bascule, sélection = bordure noire + 700 */
.tier-form__roles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tier-form__role {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
    transition:
        border-color 0.15s var(--ease),
        color 0.15s var(--ease),
        background 0.15s var(--ease);
}

.tier-form__role:hover:not(:disabled) {
    border-color: var(--gray);
    color: var(--ink);
}

.tier-form__role:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.tier-form__role:disabled {
    cursor: default;
}

.tier-form__role.is-selected {
    border-color: var(--ink);
    color: var(--ink);
    font-weight: 700;
}

.tier-form__role.is-selected > svg {
    color: var(--blue-ink);
}

@media (max-width: 599.98px) {
    .tier-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .tier-form__row--top .tier-form__label {
        padding-top: 0;
    }
}
</style>
