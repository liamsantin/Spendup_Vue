<script setup lang="ts">
/**
 * Brouillon de déclaration : une année, des cases saisies à la main.
 * Rien n'est repris des comptes. Une case vide reste vide.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import {
    ArchiveIcon,
    ArrowLeftIcon,
    CheckIcon,
    DotsIcon,
    PencilIcon,
    PlayerPlayIcon,
    PlusIcon,
    ProgressCheckIcon,
    TrashIcon
} from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { taxApi } from '@/features/tax/api';
import { TAX_BASE, taxDetailPath, taxPublicIdFromPath } from '@/features/tax/paths';
import {
    TAX_CANTONS,
    type TaxCompetence,
    type TaxIdentity,
    type TaxLine,
    type TaxPerson,
    type TaxReturn,
    type TaxReturnListItem,
    type TaxStatus
} from '@/features/tax/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const STATUSES: TaxStatus[] = ['enCours', 'preteARecopier', 'archivee'];
const emptyIdentity = (): TaxIdentity => ({
    officialName: null,
    firstName: null,
    vn: null,
    municipality: null,
    job: null
});

const list = ref<TaxReturnListItem[]>([]);
const declaration = ref<TaxReturn | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const creating = ref(false);
const year = ref(new Date().getFullYear());
const canton = ref('VD');
const person = ref<TaxPerson>('1');
const drafts = ref<Record<string, string>>({});

const cantonItems = TAX_CANTONS.map((code) => ({ title: code, value: code }));
const statusItems = computed(() => STATUSES.map((value) => ({ title: t(`taxPage.statuses.${value}`), value })));

const header = ref({
    canton: 'VD',
    couple: false,
    status: 'enCours' as TaxStatus,
    taxpayerNumber: '',
    notes: '',
    person1: emptyIdentity(),
    person2: emptyIdentity()
});

const publicId = computed(() => taxPublicIdFromPath(route.path));

const filledCount = computed(
    () => declaration.value?.sections.reduce((n, section) => n + section.lines.reduce((m, line) => m + line.values.length, 0), 0) ?? 0
);

const visibleSubtotals = computed(() => {
    const current = declaration.value;
    if (!current) return [];
    return current.subtotals.filter((row) => row.person === person.value);
});

const SITUATION = 'situation';
const step = ref(SITUATION);
const validated = ref<string[]>([]);
let headerSync = false;

const steps = computed(() => {
    const sections = declaration.value?.sections ?? [];
    return [
        { id: SITUATION, number: 1, label: t('taxPage.identity') },
        ...sections.map((section, index) => ({ id: section.code, number: index + 2, label: section.label }))
    ];
});

function stepTitle(item: { number: number; label: string }): string {
    return `${item.number} ${item.label}`;
}

function validatedKey(id: string): string {
    return `spendup.tax.validated.${id}`;
}

function loadValidated(id: string) {
    try {
        const raw = localStorage.getItem(validatedKey(id));
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        validated.value = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        validated.value = [];
    }
}

function persistValidated() {
    const id = declaration.value?.publicId ?? publicId.value;
    if (!id) return;
    localStorage.setItem(validatedKey(id), JSON.stringify(validated.value));
}

function isStepDone(id: string): boolean {
    return validated.value.includes(id);
}

function rememberStep(id: string) {
    if (!validated.value.includes(id)) validated.value = [...validated.value, id];
    persistValidated();
}

function forgetStep(id: string) {
    if (!validated.value.includes(id)) return;
    validated.value = validated.value.filter((item) => item !== id);
    persistValidated();
}

const currentStep = computed(() => steps.value.find((item) => item.id === step.value) ?? steps.value[0]);

const validateLabel = computed(() => {
    const id = step.value;
    const key = `taxPage.validate.${id}`;
    const named = t(key);
    return named === key ? t('taxPage.validate.fallback', { name: currentStep.value?.label ?? '' }) : named;
});

watch(
    publicId,
    () => {
        step.value = SITUATION;
        void refresh();
    },
    { immediate: true }
);

watch(
    () => header.value.couple,
    (couple) => {
        if (!couple) person.value = '1';
    }
);

async function refresh() {
    error.value = '';
    loading.value = true;
    try {
        if (!publicId.value) {
            declaration.value = null;
            validated.value = [];
            const result = await taxApi.list();
            list.value = result.items;
            return;
        }
        loadValidated(publicId.value);
        const detail = await taxApi.get(publicId.value);
        apply(detail);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        loading.value = false;
    }
}

function apply(detail: TaxReturn) {
    declaration.value = detail;
    headerSync = true;
    header.value = {
        canton: detail.canton,
        couple: detail.couple,
        status: detail.status,
        taxpayerNumber: detail.taxpayerNumber ?? '',
        notes: detail.notes ?? '',
        person1: { ...detail.person1 },
        person2: { ...(detail.person2 ?? emptyIdentity()) }
    };
    if (!detail.couple) person.value = '1';
    void nextTick(() => {
        headerSync = false;
    });
}

async function createReturn() {
    saving.value = true;
    error.value = '';
    try {
        const created = await taxApi.create(year.value, canton.value);
        creating.value = false;
        await router.push(taxDetailPath(created.declaration.publicId));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function saveHeader(): Promise<boolean> {
    const current = declaration.value;
    if (!current) return false;
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.update(current.publicId, {
            canton: header.value.canton,
            couple: header.value.couple,
            status: header.value.status,
            taxpayerNumber: header.value.taxpayerNumber.trim() || null,
            notes: header.value.notes.trim() || null,
            person1: cleanIdentity(header.value.person1),
            person2: header.value.couple ? cleanIdentity(header.value.person2) : null
        });
        apply(detail);
        return true;
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
        return false;
    } finally {
        saving.value = false;
    }
}

function cleanIdentity(identity: TaxIdentity): TaxIdentity {
    return {
        officialName: identity.officialName?.trim() || null,
        firstName: identity.firstName?.trim() || null,
        vn: identity.vn?.trim() || null,
        municipality: identity.municipality?.trim() || null,
        job: identity.job?.trim() || null
    };
}

function cellAmount(line: TaxLine, competence: TaxCompetence): number | null {
    const value = line.values.find((item) => item.person === person.value && item.competence === competence);
    return value ? value.amount : null;
}

function cellText(line: TaxLine, competence: TaxCompetence): string {
    const amount = cellAmount(line, competence);
    return amount == null ? '' : String(amount);
}

function draftKey(code: string, competence: TaxCompetence): string {
    return `${person.value}|${code}|${competence}`;
}

function shownAmount(line: TaxLine, competence: TaxCompetence): string {
    const key = draftKey(line.code, competence);
    return key in drafts.value ? drafts.value[key] : cellText(line, competence);
}

function setDraft(line: TaxLine, competence: TaxCompetence, value: string | number | null) {
    drafts.value = { ...drafts.value, [draftKey(line.code, competence)]: value == null ? '' : String(value) };
    const sectionId = declaration.value?.sections.find((section) => section.lines.some((item) => item.code === line.code))?.code;
    if (sectionId) forgetStep(sectionId);
}

function fillRatio(filled: number, total: number): string {
    if (total <= 0) return '0%';
    return `${Math.min(100, Math.round((filled / total) * 100))}%`;
}

async function commitAmount(line: TaxLine, competence: TaxCompetence, raw: string) {
    const current = declaration.value;
    if (!current) return;
    const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
    const next = trimmed === '' ? null : Number(trimmed);
    if (next != null && !Number.isFinite(next)) return;
    const key = draftKey(line.code, competence);
    if (next === cellAmount(line, competence)) {
        if (key in drafts.value) {
            const nextDrafts = { ...drafts.value };
            delete nextDrafts[key];
            drafts.value = nextDrafts;
        }
        return;
    }
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.upsertAmount(current.publicId, line.code, {
            person: person.value,
            competence: line.splitsCompetence ? competence : null,
            amount: next
        });
        if (key in drafts.value) {
            const nextDrafts = { ...drafts.value };
            delete nextDrafts[key];
            drafts.value = nextDrafts;
        }
        const sectionId = declaration.value?.sections.find((section) => section.lines.some((item) => item.code === line.code))?.code;
        if (sectionId) forgetStep(sectionId);
        apply(detail);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function flushCurrentDrafts(): Promise<boolean> {
    const section = declaration.value?.sections.find((item) => item.code === step.value);
    if (!section) return true;
    for (const line of section.lines) {
        const competences: TaxCompetence[] = line.splitsCompetence ? ['cantonal', 'federal'] : ['both'];
        for (const competence of competences) {
            const key = draftKey(line.code, competence);
            if (!(key in drafts.value)) continue;
            await commitAmount(line, competence, drafts.value[key]);
            if (error.value) return false;
        }
    }
    return true;
}

async function validateCurrentStep() {
    if (step.value === SITUATION) {
        const saved = await saveHeader();
        if (!saved) return;
    } else {
        const flushed = await flushCurrentDrafts();
        if (!flushed) return;
    }
    rememberStep(step.value);
    const index = steps.value.findIndex((item) => item.id === step.value);
    const next = steps.value[index + 1];
    if (next) step.value = next.id;
}

watch(
    header,
    () => {
        if (headerSync || !declaration.value) return;
        forgetStep(SITUATION);
    },
    { deep: true }
);

async function removeReturn() {
    const current = declaration.value;
    if (!current || !window.confirm(t('taxPage.deleteConfirm'))) return;
    saving.value = true;
    error.value = '';
    try {
        await taxApi.remove(current.publicId);
        await router.push(TAX_BASE);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

function openReturn(id: string) {
    void router.push(taxDetailPath(id));
}

function onCardActivate(event: MouseEvent, id: string) {
    if (saving.value) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    openReturn(id);
}

async function setReturnStatus(item: TaxReturnListItem, status: TaxStatus) {
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.get(item.publicId);
        await taxApi.update(item.publicId, {
            canton: detail.canton,
            couple: detail.couple,
            status,
            taxpayerNumber: detail.taxpayerNumber,
            notes: detail.notes,
            person1: detail.person1,
            person2: detail.person2
        });
        await refresh();
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function removeFromList(item: TaxReturnListItem) {
    if (!window.confirm(t('taxPage.deleteConfirm'))) return;
    saving.value = true;
    error.value = '';
    try {
        await taxApi.remove(item.publicId);
        await refresh();
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

function money(value: number | null): string {
    if (value == null) return t('common.emptyValue');
    return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'CHF' }).format(value);
}
</script>

<template>
    <AppPageShell v-if="!declaration" :title="t('taxPage.title')" :subtitle="t('taxPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn su-btn--ink" @click="creating = !creating">
                <PlusIcon :size="18" />
                {{ t('taxPage.new') }}
            </button>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
        <p v-if="loading" class="tax-muted">{{ t('taxPage.loading') }}</p>

        <form v-if="creating" class="tax-form" @submit.prevent="createReturn">
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-year">{{ t('taxPage.year') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-create-year"
                        v-model.number="year"
                        type="number"
                        min="2000"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-create-canton">{{ t('taxPage.canton') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-create-canton"
                        v-model="canton"
                        :items="cantonItems"
                        :label="t('taxPage.canton')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__actions">
                <button type="submit" class="su-btn su-btn--ink" :disabled="saving">{{ t('taxPage.create') }}</button>
                <button type="button" class="su-btn" @click="creating = false">{{ t('taxPage.cancel') }}</button>
            </div>
        </form>

        <p v-if="!loading && !list.length" class="tax-muted">{{ t('taxPage.empty') }}</p>
        <div v-else class="tax-list">
            <article
                v-for="item in list"
                :key="item.publicId"
                class="tax-card"
                role="button"
                tabindex="0"
                @click="onCardActivate($event, item.publicId)"
                @keydown.enter.prevent="openReturn(item.publicId)"
            >
                <div class="tax-card__head">
                    <p class="tax-card__kicker">{{ item.canton }}</p>
                    <div class="tax-card__actions" @click.stop>
                        <v-menu location="bottom end" :offset="4">
                            <template #activator="{ props: menuProps }">
                                <button v-bind="menuProps" type="button" class="su-orb" :disabled="saving" :aria-label="t('common.more')">
                                    <DotsIcon :size="18" stroke-width="1.75" />
                                </button>
                            </template>
                            <v-sheet class="su-menu tax-actions-menu">
                                <button type="button" class="su-menu-item" :disabled="saving" @click="openReturn(item.publicId)">
                                    <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.open') }}</span>
                                </button>
                                <button
                                    v-if="item.status !== 'preteARecopier'"
                                    type="button"
                                    class="su-menu-item"
                                    :disabled="saving"
                                    @click="setReturnStatus(item, 'preteARecopier')"
                                >
                                    <span class="su-menu-item__icon"><ProgressCheckIcon :size="18" stroke-width="1.6" /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.ready') }}</span>
                                </button>
                                <button
                                    v-if="item.status !== 'enCours'"
                                    type="button"
                                    class="su-menu-item"
                                    :disabled="saving"
                                    @click="setReturnStatus(item, 'enCours')"
                                >
                                    <span class="su-menu-item__icon"><PlayerPlayIcon :size="18" stroke-width="1.6" /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.resume') }}</span>
                                </button>
                                <button
                                    v-if="item.status !== 'archivee'"
                                    type="button"
                                    class="su-menu-item"
                                    :disabled="saving"
                                    @click="setReturnStatus(item, 'archivee')"
                                >
                                    <span class="su-menu-item__icon"><ArchiveIcon :size="18" stroke-width="1.6" /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.archive') }}</span>
                                </button>
                                <button
                                    type="button"
                                    class="su-menu-item tax-actions-menu__delete"
                                    :disabled="saving"
                                    @click="removeFromList(item)"
                                >
                                    <span class="su-menu-item__icon su-menu-item__icon--danger"
                                        ><TrashIcon :size="18" stroke-width="1.6"
                                    /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.delete') }}</span>
                                </button>
                            </v-sheet>
                        </v-menu>
                    </div>
                </div>
                <h3 class="tax-card__name">{{ item.year }}</h3>
                <p class="tax-card__sub">{{ t(`taxPage.statuses.${item.status}`) }}</p>
                <div
                    class="su-gauge tax-card__gauge"
                    role="img"
                    :aria-label="t('taxPage.filled', { filled: item.filledCount, total: item.lineCount }, item.filledCount)"
                >
                    <span class="su-gauge__fill su-gauge__fill--blue" :style="{ width: fillRatio(item.filledCount, item.lineCount) }" />
                </div>
                <div class="su-kv su-kv--strong">
                    <span>{{ t('taxPage.filled', { filled: item.filledCount, total: item.lineCount }, item.filledCount) }}</span>
                    <span>{{ fillRatio(item.filledCount, item.lineCount) }}</span>
                </div>
            </article>
        </div>
    </AppPageShell>

    <AppPageShell v-else :title="`${declaration.year} · ${declaration.canton}`" :subtitle="t('taxPage.subtitle')">
        <template #tabs>
            <nav class="su-tabs" :aria-label="t('taxPage.steps')">
                <button
                    v-for="item in steps"
                    :key="item.id"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': step === item.id, 'is-done': isStepDone(item.id) }"
                    :aria-pressed="step === item.id"
                    :aria-label="`${stepTitle(item)}, ${isStepDone(item.id) ? t('taxPage.stepDone') : t('taxPage.stepOpen')}`"
                    @click="step = item.id"
                >
                    <span class="su-tab__label" :data-label="stepTitle(item)">{{ stepTitle(item) }}</span>
                    <CheckIcon v-if="isStepDone(item.id)" :size="14" stroke-width="2" aria-hidden="true" />
                </button>
            </nav>
        </template>
        <template #actions>
            <button type="button" class="su-btn" @click="router.push(TAX_BASE)">
                <ArrowLeftIcon :size="18" />
                {{ t('taxPage.back') }}
            </button>
            <button type="button" class="su-btn" :disabled="saving" @click="removeReturn">{{ t('taxPage.delete') }}</button>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
        <p v-if="saving" class="tax-muted">{{ t('taxPage.saving') }}</p>

        <form v-show="step === SITUATION" class="tax-form" @submit.prevent="validateCurrentStep">
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-status">{{ t('taxPage.status') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-status"
                        v-model="header.status"
                        :items="statusItems"
                        :label="t('taxPage.status')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-canton">{{ t('taxPage.canton') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-canton"
                        v-model="header.canton"
                        :items="cantonItems"
                        :label="t('taxPage.canton')"
                        :disabled="filledCount > 0"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-couple">{{ t('taxPage.couple') }}</label>
                <div class="tax-form__field">
                    <AppSwitch id="tax-couple" v-model="header.couple" />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-taxpayer">{{ t('taxPage.taxpayerNumber') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-taxpayer"
                        v-model="header.taxpayerNumber"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="40"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-notes">{{ t('taxPage.notes') }}</label>
                <div class="tax-form__field">
                    <v-textarea
                        id="tax-notes"
                        v-model="header.notes"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        rows="2"
                        maxlength="4000"
                        auto-grow
                    />
                </div>
            </div>

            <h2 class="tax-form__legend">{{ t('taxPage.persons.1') }}</h2>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-p1-name">{{ t('taxPage.officialName') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-p1-name"
                        v-model="header.person1.officialName"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="100"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-p1-first">{{ t('taxPage.firstName') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-p1-first"
                        v-model="header.person1.firstName"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="100"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-p1-vn">{{ t('taxPage.vn') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-p1-vn"
                        v-model="header.person1.vn"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="16"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-p1-city">{{ t('taxPage.municipality') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-p1-city"
                        v-model="header.person1.municipality"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="100"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-p1-job">{{ t('taxPage.job') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-p1-job"
                        v-model="header.person1.job"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="100"
                    />
                </div>
            </div>

            <template v-if="header.couple">
                <h2 class="tax-form__legend">{{ t('taxPage.persons.2') }}</h2>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-p2-name">{{ t('taxPage.officialName') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-p2-name"
                            v-model="header.person2.officialName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-p2-first">{{ t('taxPage.firstName') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-p2-first"
                            v-model="header.person2.firstName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-p2-vn">{{ t('taxPage.vn') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-p2-vn"
                            v-model="header.person2.vn"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="16"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-p2-city">{{ t('taxPage.municipality') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-p2-city"
                            v-model="header.person2.municipality"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-p2-job">{{ t('taxPage.job') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-p2-job"
                            v-model="header.person2.job"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
            </template>
        </form>

        <nav v-if="header.couple && step !== SITUATION" class="su-tabs tax-person" :aria-label="t('taxPage.person')">
            <button
                type="button"
                class="su-tab"
                :class="{ 'is-active': person === '1' }"
                :aria-pressed="person === '1'"
                @click="person = '1'"
            >
                <span class="su-tab__label" :data-label="t('taxPage.persons.1')">{{ t('taxPage.persons.1') }}</span>
            </button>
            <button
                type="button"
                class="su-tab"
                :class="{ 'is-active': person === '2' }"
                :aria-pressed="person === '2'"
                @click="person = '2'"
            >
                <span class="su-tab__label" :data-label="t('taxPage.persons.2')">{{ t('taxPage.persons.2') }}</span>
            </button>
            <button
                type="button"
                class="su-tab"
                :class="{ 'is-active': person === '1+2' }"
                :aria-pressed="person === '1+2'"
                @click="person = '1+2'"
            >
                <span class="su-tab__label" :data-label="t('taxPage.persons.both')">{{ t('taxPage.persons.both') }}</span>
            </button>
        </nav>

        <section v-if="step === SITUATION && visibleSubtotals.length" class="tax-totals">
            <h2>{{ t('taxPage.subtotals') }}</h2>
            <article v-for="row in visibleSubtotals" :key="row.competence" class="tax-card">
                <h3 class="tax-card__name">{{ t(`taxPage.${row.competence}`) }}</h3>
                <div class="su-kv">
                    <span>{{ t('taxPage.income') }}</span
                    ><span>{{ money(row.income) }}</span>
                </div>
                <div class="su-kv">
                    <span>{{ t('taxPage.deductions') }}</span
                    ><span>{{ money(row.deductions) }}</span>
                </div>
                <div class="su-kv su-kv--strong">
                    <span>{{ t('taxPage.netIncome') }}</span
                    ><span>{{ money(row.netIncome) }}</span>
                </div>
                <div class="su-kv">
                    <span>{{ t('taxPage.assets') }}</span
                    ><span>{{ money(row.assets) }}</span>
                </div>
                <div class="su-kv">
                    <span>{{ t('taxPage.liabilities') }}</span
                    ><span>{{ money(row.liabilities) }}</span>
                </div>
                <div class="su-kv su-kv--strong">
                    <span>{{ t('taxPage.netAssets') }}</span
                    ><span>{{ money(row.netAssets) }}</span>
                </div>
            </article>
        </section>

        <p v-show="step === SITUATION" class="tax-muted">
            {{ t('taxPage.gaps', { count: declaration.gaps.length }, declaration.gaps.length) }}
        </p>

        <section v-for="section in declaration.sections" v-show="step === section.code" :key="section.code" class="tax-section">
            <div
                v-for="line in section.lines"
                :key="line.code"
                class="tax-form tax-line"
                :class="{ 'is-empty': !line.values.some((value) => value.person === person) }"
            >
                <div v-if="line.splitsCompetence" class="tax-form__row">
                    <p class="tax-form__label">{{ line.label }}</p>
                    <div class="tax-form__field tax-form__split">
                        <v-text-field
                            :model-value="shownAmount(line, 'cantonal')"
                            :label="t('taxPage.cantonal')"
                            :placeholder="t('taxPage.emptyCell')"
                            color="primary"
                            variant="outlined"
                            hide-details
                            @update:model-value="setDraft(line, 'cantonal', $event)"
                            @blur="commitAmount(line, 'cantonal', shownAmount(line, 'cantonal'))"
                        />
                        <v-text-field
                            :model-value="shownAmount(line, 'federal')"
                            :label="t('taxPage.federal')"
                            :placeholder="t('taxPage.emptyCell')"
                            color="primary"
                            variant="outlined"
                            hide-details
                            @update:model-value="setDraft(line, 'federal', $event)"
                            @blur="commitAmount(line, 'federal', shownAmount(line, 'federal'))"
                        />
                    </div>
                </div>
                <div v-else class="tax-form__row">
                    <label class="tax-form__label" :for="`tax-line-${line.code}`">{{ line.label }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            :id="`tax-line-${line.code}`"
                            :model-value="shownAmount(line, 'both')"
                            :placeholder="t('taxPage.emptyCell')"
                            color="primary"
                            variant="outlined"
                            hide-details
                            @update:model-value="setDraft(line, 'both', $event)"
                            @blur="commitAmount(line, 'both', shownAmount(line, 'both'))"
                        />
                    </div>
                </div>
            </div>
        </section>

        <div class="tax-step-foot">
            <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="validateCurrentStep">
                {{ validateLabel }}
            </button>
            <p v-if="isStepDone(step)" class="tax-step-foot__done">
                <span class="su-sq" aria-hidden="true" />
                {{ t('taxPage.stepDone') }}
            </p>
        </div>
    </AppPageShell>
</template>

<style scoped>
.tax-error {
    color: var(--danger);
    margin: 0 0 16px;
}

.tax-muted {
    color: var(--gray);
    margin: 0 0 16px;
}

.tax-list,
.tax-totals {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px 32px;
    width: 100%;
    margin: 8px 0 28px;
}

.tax-totals h2,
.tax-section h2,
.tax-form__legend {
    grid-column: 1 / -1;
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.tax-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 18px 20px 16px;
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    transition: border-color 0.15s var(--ease);
}

.tax-card[role='button'] {
    cursor: pointer;
}

.tax-card[role='button']:hover,
.tax-card[role='button']:focus-visible {
    border-color: var(--ink);
}

.tax-card:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
}

.tax-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 36px;
}

.tax-card__actions {
    display: flex;
    margin: -4px -8px -4px 0;
}

@media (hover: hover) and (pointer: fine) {
    .tax-card__actions {
        opacity: 0;
        transition: opacity 0.15s var(--ease);
    }

    .tax-card:hover .tax-card__actions,
    .tax-card:focus-within .tax-card__actions {
        opacity: 1;
    }
}

.tax-card__kicker {
    margin: 0;
    color: var(--gray);
    font-size: 16px;
}

.tax-actions-menu {
    width: min(260px, calc(100vw - 32px));
}

.tax-actions-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.tax-actions-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.tax-actions-menu__delete .su-menu-item__title {
    color: var(--danger);
}

.tax-card__name {
    margin: 6px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
}

.tax-card__sub {
    margin: 2px 0 14px;
    color: var(--gray);
    font-size: 13px;
}

.tax-card__gauge {
    margin-bottom: 8px;
}

.tax-card > .su-kv:last-child {
    border-bottom: 1px solid var(--line);
}

.tax-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 28px;
}

.tax-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.tax-form__label {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.tax-line.is-empty .tax-form__label {
    color: var(--gray);
}

.tax-form__field {
    min-width: 0;
}

.tax-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.tax-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.tax-form__split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.tax-form__actions {
    display: flex;
    gap: 8px;
}

.tax-person {
    margin: 8px 0 28px;
}

.su-tab.is-done {
    color: var(--blue-ink);
}

.su-tab.is-done.is-active {
    box-shadow: inset 0 -2px 0 var(--blue);
}

.tax-step-foot {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
}

.tax-step-foot__done {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--blue-ink);
    font-size: 14px;
    --sq-color: var(--blue);
}

.tax-section {
    display: flex;
    flex-direction: column;
    gap: 28px;
    margin-bottom: 28px;
}

.tax-line {
    margin-bottom: 0;
}

@media (max-width: 1199.98px) {
    .tax-list,
    .tax-totals {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .tax-list,
    .tax-totals {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
    }

    .tax-form__row,
    .tax-form__split {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
