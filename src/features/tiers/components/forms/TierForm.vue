<script setup lang="ts">
/**
 * Champs du formulaire tier. `form` est détenu par le parent.
 * Un seul volet affiché, commuté par le sélecteur de nature.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TierForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { todayUtcYmd } from '@/features/tiers/format';
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
    }>(),
    {
        fieldErrors: () => ({}),
        natureHint: null
    }
);

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

const birthDateModel = computed({
    get: () => props.form.person.birthDate,
    set: (value: string | null) => {
        props.form.person.birthDate = value;
    }
});

function hasRole(role: TierRole): boolean {
    return props.form.roles.includes(role);
}

function toggleRole(role: TierRole) {
    if (hasRole(role)) {
        props.form.roles = props.form.roles.filter((item) => item !== role);
        return;
    }
    props.form.roles = TIER_ROLES.filter((item) => item === role || props.form.roles.includes(item));
}
</script>

<template>
    <div class="tier-form">
        <p class="tier-form__section">{{ t('tiersPage.form.sections.identity') }}</p>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-name"> {{ t('tiersPage.form.fields.name') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="tier-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                    :maxlength="TIER_NAME_MAX"
                    :placeholder="t('tiersPage.form.placeholders.name')"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-nature"> {{ t('tiersPage.form.fields.nature') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
        <v-row class="align-start" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <span class="v-label font-weight-medium tier-form__roles-label">{{ t('tiersPage.form.fields.roles') }}</span>
            </v-col>
            <v-col cols="12" sm="9">
                <div class="tier-form__roles" role="group" :aria-label="t('tiersPage.form.fields.roles')">
                    <button
                        v-for="role in TIER_ROLES"
                        :key="role"
                        type="button"
                        class="tier-form__role"
                        :class="{ 'is-selected': hasRole(role) }"
                        :aria-pressed="hasRole(role)"
                        @click="toggleRole(role)"
                    >
                        <CheckIcon v-if="hasRole(role)" :size="13" stroke-width="2.4" />
                        {{ t(`tiersPage.roles.${role}`) }}
                    </button>
                </div>
                <div v-if="fieldErrors.roles" class="text-caption text-error mt-1">{{ fieldErrors.roles }}</div>
                <div v-else class="text-caption text-medium-emphasis mt-1">{{ t('tiersPage.form.rolesHint') }}</div>
            </v-col>
        </v-row>

        <template v-if="panelTitle">
            <p class="tier-form__section">{{ panelTitle }}</p>

            <template v-if="form.nature === 'person'">
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-first-name">{{
                            t('tiersPage.form.fields.firstName')
                        }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-last-name">{{
                            t('tiersPage.form.fields.lastName')
                        }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium">{{ t('tiersPage.form.fields.birthDate') }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
                        <AppDatePicker
                            v-model="birthDateModel"
                            color="primary"
                            hide-details="auto"
                            :max="todayUtc"
                            :placeholder="t('tiersPage.form.placeholders.birthDate')"
                        />
                        <div v-if="fieldErrors['person.birthDate']" class="text-caption text-error mt-1">
                            {{ fieldErrors['person.birthDate'] }}
                        </div>
                    </v-col>
                </v-row>
            </template>

            <template v-else-if="form.nature === 'company'">
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-legal-name">{{
                            t('tiersPage.form.fields.legalName')
                        }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-vat">{{ t('tiersPage.form.fields.vatNumber') }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-registration">
                            {{ t('tiersPage.form.fields.companyRegistrationNumber') }}
                        </label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
            </template>

            <template v-else-if="form.nature === 'organization'">
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-official-name">
                            {{ t('tiersPage.form.fields.officialName') }}
                        </label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-organization-type">
                            {{ t('tiersPage.form.fields.organizationType') }}
                        </label>
                    </v-col>
                    <v-col cols="12" sm="9">
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
                    </v-col>
                </v-row>
            </template>
        </template>

        <p class="tier-form__section">{{ t('tiersPage.form.sections.contact') }}</p>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-email">{{ t('tiersPage.form.fields.email') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-phone">{{ t('tiersPage.form.fields.phone') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-website">{{ t('tiersPage.form.fields.website') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
        <v-row class="align-start" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium tier-form__roles-label" for="tier-form-notes">{{
                    t('tiersPage.form.fields.notes')
                }}</label>
            </v-col>
            <v-col cols="12" sm="9">
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
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.tier-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tier-form__section {
    margin: 12px 0 2px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.tier-form__section:first-child {
    margin-top: 0;
}

.tier-form__roles-label {
    display: inline-block;
    padding-top: 10px;
}

.tier-form__roles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 6px;
}

.tier-form__role {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px solid var(--thread);
    border-radius: 999px;
    background: var(--surface-raised);
    color: var(--ink-muted);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.tier-form__role:hover {
    border-color: rgba(var(--v-theme-primary), 0.35);
    color: var(--ink);
}

.tier-form__role.is-selected {
    border-color: rgba(var(--v-theme-primary), 0.55);
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

@media (max-width: 599.98px) {
    .tier-form {
        gap: 12px;
    }

    .tier-form :deep(.v-label) {
        margin-bottom: 4px;
    }

    .tier-form__roles-label {
        padding-top: 0;
    }
}
</style>
