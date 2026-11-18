<script setup lang="ts">
/**
 * Brouillon de déclaration : une année, des cases saisies à la main ou acceptées une à une.
 * La page orchestre l'état et les appels API ; l'affichage vit dans `features/tax/components/`.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import {
    ArrowBackUpIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    CircleCheckIcon,
    DotsIcon,
    DownloadIcon,
    PlusIcon,
    TrashIcon,
    UploadIcon
} from 'vue-tabler-icons';
import { withReturnTo } from '@/utils/helpers/navigation-helpers';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { useAuthStore } from '@/features/auth';
import { taxApi, type TaxAcceptBody, type TaxAmountItem } from '@/features/tax/api';
import { useCantonItems } from '@/features/tax/cantons';
import TaxChecklistSection from '@/features/tax/components/TaxChecklistSection.vue';
import TaxCorrectModal, { type TaxCorrectPayload } from '@/features/tax/components/TaxCorrectModal.vue';
import TaxCreateModal, { type TaxCreatePayload } from '@/features/tax/components/TaxCreateModal.vue';
import TaxDocumentsSection from '@/features/tax/components/TaxDocumentsSection.vue';
import TaxExportModal, { type TaxExportKind } from '@/features/tax/components/TaxExportModal.vue';
import TaxFileModal from '@/features/tax/components/TaxFileModal.vue';
import TaxFichesSection, { type TaxFicheDraft } from '@/features/tax/components/TaxFichesSection.vue';
import TaxHeaderForm from '@/features/tax/components/TaxHeaderForm.vue';
import TaxImportModal, { type TaxImportPayload } from '@/features/tax/components/TaxImportModal.vue';
import TaxImportReview from '@/features/tax/components/TaxImportReview.vue';
import TaxPdfZoneModal from '@/features/tax/components/TaxPdfZoneModal.vue';
import TaxLineRow from '@/features/tax/components/TaxLineRow.vue';
import TaxInstallmentsSection from '@/features/tax/components/TaxInstallmentsSection.vue';
import TaxRemindersSection from '@/features/tax/components/TaxRemindersSection.vue';
import TaxDocumentCandidates from '@/features/tax/components/TaxDocumentCandidates.vue';
import TaxThemesSection from '@/features/tax/components/TaxThemesSection.vue';
import TaxMedicalSection from '@/features/tax/components/TaxMedicalSection.vue';
import TaxPillar3aSection from '@/features/tax/components/TaxPillar3aSection.vue';
import TaxReadProposals from '@/features/tax/components/TaxReadProposals.vue';
import TaxReturnCard from '@/features/tax/components/TaxReturnCard.vue';
import TaxSubtotals from '@/features/tax/components/TaxSubtotals.vue';
import TaxSuggestionList from '@/features/tax/components/TaxSuggestionList.vue';
import TaxTotalsEntry from '@/features/tax/components/TaxTotalsEntry.vue';
import { useTaxValidatedSteps } from '@/features/tax/composables/useTaxValidatedSteps';
import { cleanIdentity, emptyHeader, emptyIdentity } from '@/features/tax/identity';
import { buildTaxBundle } from '@/features/tax/bundle';
import { importTaxPdf } from '@/features/tax/import-return';
import { readImportedFlag, writeImportedFlag } from '@/features/tax/imported-flag';
import { clearPendingRead, dismissReadReport, forgetPendingRead, isImportedReturn, takePendingRead } from '@/features/tax/pending-read';
import { compareWithPrevious, markAllToCheck, previousAmountFor, scopeMismatch, type ReadScope } from '@/features/tax/read-checks';
import type { ReadLine, TotalCheck } from '@/features/tax/reader/types';
import { buildTaxGroups, type TaxGroup } from '@/features/tax/steps';
import { formatTaxDate } from '@/features/tax/format';
import { dismissGuided, isGuidedDismissed } from '@/features/tax/guided-totals';
import { TAX_BASE, taxDetailPath, taxPublicIdFromPath } from '@/features/tax/paths';
import type {
    TaxCompetence,
    TaxCorrection,
    TaxEntryKind,
    TaxLine,
    TaxDocumentCandidate,
    TaxMedical,
    TaxPerson,
    TaxPillar3a,
    TaxReminder,
    TaxReturn,
    TaxReturnListItem,
    TaxStatus,
    TaxSuggestion,
    TaxThemes
} from '@/features/tax/types';
import { isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import { useFilesStore } from '@/features/files/stores/files-store';
import type { FileDto } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const { t, te, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const STATUSES: TaxStatus[] = ['enCours', 'preteARecopier', 'archivee'];
/** Une déclaration déposée ne revient pas en arrière : elle reste déposée, ou s'archive. */
const LOCKED_STATUSES: TaxStatus[] = ['deposee', 'archivee'];

const list = ref<TaxReturnListItem[]>([]);
const declaration = ref<TaxReturn | null>(null);
const loading = ref(false);

// Chargement signalé par le curseur uniquement (pas de texte qui décale la page).
watch(loading, (value) => {
    document.body.style.cursor = value ? 'progress' : '';
});
onBeforeUnmount(() => {
    document.body.style.cursor = '';
});
const saving = ref(false);
const error = ref('');
const notice = ref('');
const creating = ref(false);
const importing = ref(false);
const auth = useAuthStore();
/** Canton du profil s'il est renseigné (Suisse), sinon Vaud : sert de valeur par défaut à la création et à l'import. */
function defaultCanton(): string {
    return auth.user?.canton ?? 'VD';
}
const person = ref<TaxPerson>('1');
const drafts = ref<Record<string, string>>({});
const suggestions = ref<TaxSuggestion[]>([]);
const pillar3a = ref<TaxPillar3a | null>(null);
const medical = ref<TaxMedical | null>(null);
const themes = ref<TaxThemes | null>(null);
const documentCandidates = ref<TaxDocumentCandidate[]>([]);
const reminders = ref<TaxReminder[]>([]);
const suggestionKey = (item: TaxSuggestion) => `${item.code}|${item.person}|${item.competence}`;
/** Lecture locale d'un PDF importé, à vérifier (persistée sur l'appareil). */
const readItems = ref<TaxSuggestion[]>([]);
/** PDF lu (fichier de la bibliothèque), pour montrer la zone d'un montant ; `null` pour une lecture plus ancienne. */
const readFile = ref<string | null>(null);
/** Montant lu dont on montre la zone dans le PDF. */
const zoneItem = ref<TaxSuggestion | null>(null);
const zoneOpen = computed({
    get: () => zoneItem.value !== null,
    set: (open: boolean) => {
        if (!open) zoneItem.value = null;
    }
});
const readReport = ref<{ profileLabel: string; scope?: ReadScope; totals: TotalCheck[]; unmapped: ReadLine[] } | null>(null);
const filesStore = useFilesStore();
const attaching = ref(false);
const attachLine = ref('');

const cantonItems = useCantonItems();
const statusItems = computed(() =>
    (declaration.value?.locked ? LOCKED_STATUSES : STATUSES).map((value) => ({ title: t(`taxPage.statuses.${value}`), value }))
);

const lockedNotice = computed(() => {
    const current = declaration.value;
    if (!current?.locked) return '';
    return t('taxPage.locked', { date: formatTaxDate(current.submissionDate, locale.value) });
});

/** Profil cantonal pas encore relu, ou repris d'une année antérieure : signalé discrètement. */
const profileNotice = computed(() => {
    const profile = declaration.value?.profile;
    if (!profile) return '';
    if (profile.otherYear) {
        return t('taxPage.profile.otherYear', { canton: profile.canton, year: profile.year, current: declaration.value?.year ?? '' });
    }
    return profile.status === 'draft' ? t('taxPage.profile.draft', { canton: profile.canton, year: profile.year }) : '';
});

const header = ref(emptyHeader());

const detailTitle = computed(() => {
    const current = declaration.value;
    if (!current) return '';
    const name = current.name?.trim();
    return name ? `${name} · ${current.year}` : `${current.year} · ${current.canton}`;
});

const detailSubtitle = computed(() => {
    const current = declaration.value;
    if (!current?.name?.trim()) return t('taxPage.subtitle');
    return current.canton;
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
const PIECES = 'pieces';
const PAYMENTS = 'payments';
const step = ref(SITUATION);
let headerSync = false;

const {
    load: loadValidated,
    reset: resetValidated,
    isDone: isStepDone,
    remember: rememberStep,
    forget: forgetStep
} = useTaxValidatedSteps(() => declaration.value?.publicId ?? publicId.value);

const groups = computed(() => buildTaxGroups(declaration.value?.sections ?? []));

function stepLabel(group: TaxGroup): string {
    const key = `taxPage.stepLabels.${group.id}`;
    const text = t(key);
    return text === key ? group.fallbackLabel : text;
}

/** Libellé complet d'une étape (au survol et pour les lecteurs d'écran) ; l'onglet garde le libellé court. */
function stepLong(group: TaxGroup): string {
    const key = `taxPage.stepTitles.${group.id}`;
    return te(key) ? t(key) : stepLabel(group);
}

const steps = computed(() => [
    { id: SITUATION, number: 1, label: t('taxPage.identity'), long: t('taxPage.identity') },
    ...groups.value.map((group, index) => ({ id: group.id, number: index + 2, label: stepLabel(group), long: stepLong(group) })),
    { id: PIECES, number: groups.value.length + 2, label: t('taxPage.checklist.step'), long: t('taxPage.checklist.title') },
    { id: PAYMENTS, number: groups.value.length + 3, label: t('taxPage.installments.step'), long: t('taxPage.installments.heading') }
]);

/** Barre d'onglets : fondu quand des onglets sont cachés d'un côté, onglet actif toujours à l'écran. */
const stepsNav = ref<HTMLElement | null>(null);
const stepsFade = ref({ left: false, right: false });
let stepsObserver: ResizeObserver | null = null;

function updateStepsFade() {
    const nav = stepsNav.value;
    if (!nav) return;
    stepsFade.value = { left: nav.scrollLeft > 2, right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2 };
}

watch(stepsNav, (nav) => {
    stepsObserver?.disconnect();
    stepsObserver = null;
    if (nav && typeof ResizeObserver !== 'undefined') {
        stepsObserver = new ResizeObserver(updateStepsFade);
        stepsObserver.observe(nav);
    }
    updateStepsFade();
});

watch(step, async () => {
    await nextTick();
    stepsNav.value?.querySelector('.su-tab.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    updateStepsFade();
});

onBeforeUnmount(() => stepsObserver?.disconnect());

const currentGroup = computed(() => groups.value.find((group) => group.id === step.value));

/** Texte d'aide d'une case, s'il existe : `taxPage.help.<code>` (le code « income.employed » devient un chemin). */
function helpFor(line: TaxLine): string {
    const key = `taxPage.help.${line.code}`;
    return te(key) ? t(key) : '';
}

function groupOf(code: string): TaxGroup | undefined {
    return groups.value.find((group) => group.lines.some((item) => item.code === code));
}

function stepTitle(item: { number: number; label: string }): string {
    return `${item.number} ${item.label}`;
}

const currentStep = computed(() => steps.value.find((item) => item.id === step.value) ?? steps.value[0]);

const ficheKinds = computed((): TaxEntryKind[] => {
    if (step.value === SITUATION) return ['child'];
    if (step.value === 'revenus') return ['employment'];
    if (step.value === 'fortune') return ['property', 'institution'];
    if (step.value === 'dettes') return ['debt'];
    return [];
});

function parseFicheAmount(raw: string): number | null {
    const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
}

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
    notice.value = '';
    loading.value = true;
    try {
        if (!publicId.value) {
            declaration.value = null;
            resetValidated();
            const result = await taxApi.list();
            list.value = result.items;
            return;
        }
        loadValidated(publicId.value);
        const detail = await taxApi.get(publicId.value);
        apply(detail);
        await loadSuggestions(publicId.value);
        const pending = takePendingRead(publicId.value);
        readItems.value = [...new Map(pending.items.map((item) => [suggestionKey(item), item])).values()];
        readReport.value = pending.report;
        readFile.value = pending.filePublicId;
        // Un formulaire d'un autre canton ou d'une autre année : plus rien n'est « vérifié ».
        if (scopeMismatch(pending.report?.scope, detail.canton, detail.year)) readItems.value = markAllToCheck(readItems.value);
        void loadPreviousReturn(detail);
        if (pending) {
            const known = new Set(suggestions.value.map((item) => `${item.code}|${item.person}|${item.competence}`));
            suggestions.value = [
                ...suggestions.value,
                ...pending.items.filter((item) => !known.has(`${item.code}|${item.person}|${item.competence}`))
            ];
            if (pending.notice) {
                notice.value = pending.notice;
                writeImportedFlag(null);
            }
        }
        if (readImportedFlag() === publicId.value) {
            notice.value = t('taxPage.importDone');
            writeImportedFlag(null);
        }
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        loading.value = false;
    }
}

/** Déclaration de l'an dernier : celle dont on est issu, sinon la même du même canton. Sert de référence et de contrôle. */
const previousReturn = ref<TaxReturn | null>(null);

async function loadPreviousReturn(current: TaxReturn) {
    previousReturn.value = null;
    try {
        let previousId = current.previousPublicId;
        if (!previousId) {
            const { items } = await taxApi.list();
            previousId =
                items.find((item) => item.year === current.year - 1 && item.canton === current.canton && item.publicId !== current.publicId)
                    ?.publicId ?? null;
        }
        if (!previousId) return;
        const detail = await taxApi.get(previousId);
        if (declaration.value?.publicId !== current.publicId) return;
        previousReturn.value = detail;
        // un écart anormal avec l'an dernier repasse la ligne lue « à vérifier »
        if (readItems.value.length) readItems.value = compareWithPrevious(readItems.value, detail);
    } catch {
        /* la référence est un plus : sans elle, la page reste utilisable */
    }
}

/** Montants de l'an dernier sur cette ligne, pour la personne affichée. */
function previousFor(line: TaxLine): Partial<Record<TaxCompetence, number>> {
    const before = previousReturn.value;
    if (!before) return {};
    const out: Partial<Record<TaxCompetence, number>> = {};
    const competences: TaxCompetence[] = line.splitsCompetence ? ['cantonal', 'federal'] : ['both'];
    for (const competence of competences) {
        const amount = previousAmountFor(before, { code: line.code, person: person.value, competence });
        if (amount != null) out[competence] = amount;
    }
    return out;
}

function apply(detail: TaxReturn) {
    declaration.value = detail;
    headerSync = true;
    header.value = {
        name: detail.name ?? '',
        canton: detail.canton,
        couple: detail.couple,
        status: detail.status,
        civilStatus: detail.civilStatus ?? '',
        taxationMode: detail.taxationMode,
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

function openCreate() {
    error.value = '';
    creating.value = true;
}

function openImport() {
    error.value = '';
    importing.value = true;
}

async function createReturn(payload: TaxCreatePayload) {
    if (saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        const created = await taxApi.create(payload.year, payload.canton, payload.name);
        const hasIdentity = Object.values(payload.person1).some(Boolean) || payload.couple;
        if (hasIdentity) {
            const base = created.declaration;
            await taxApi.update(base.publicId, {
                canton: base.canton,
                couple: payload.couple,
                status: base.status,
                civilStatus: base.civilStatus,
                taxationMode: base.taxationMode,
                taxpayerNumber: base.taxpayerNumber,
                notes: base.notes,
                name: base.name,
                person1: payload.person1,
                person2: payload.person2
            });
        }
        creating.value = false;
        await router.push(taxDetailPath(created.declaration.publicId));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function importReturn(payload: TaxImportPayload) {
    if (!payload.file) {
        error.value = t('taxPage.importFileRequired');
        return;
    }
    saving.value = true;
    error.value = '';
    const { createdId, failure } = await importTaxPdf({
        file: payload.file,
        year: payload.year,
        canton: payload.canton,
        name: payload.name,
        t
    });
    saving.value = false;
    error.value = failure;
    if (!createdId) return;
    importing.value = false;
    if (!failure) {
        await router.push(taxDetailPath(createdId));
        return;
    }
    await refresh();
    error.value = failure;
}

async function saveHeader(submissionDate?: string): Promise<boolean> {
    const current = declaration.value;
    if (!current) return false;
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.update(current.publicId, {
            canton: header.value.canton,
            couple: header.value.couple,
            status: header.value.status,
            civilStatus: header.value.civilStatus || null,
            taxationMode: header.value.taxationMode,
            taxpayerNumber: header.value.taxpayerNumber.trim() || null,
            notes: header.value.notes.trim() || null,
            name: header.value.name.trim() || null,
            person1: cleanIdentity(header.value.person1),
            person2: header.value.couple ? cleanIdentity(header.value.person2) : null,
            submissionDate: submissionDate ?? null
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

function shownFor(line: TaxLine): Record<TaxCompetence, string> {
    return { cantonal: shownAmount(line, 'cantonal'), federal: shownAmount(line, 'federal'), both: shownAmount(line, 'both') };
}

function setDraft(line: TaxLine, competence: TaxCompetence, value: string | number | null) {
    drafts.value = { ...drafts.value, [draftKey(line.code, competence)]: value == null ? '' : String(value) };
    const sectionId = groupOf(line.code)?.id;
    if (sectionId) forgetStep(sectionId);
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
        const sectionId = groupOf(line.code)?.id;
        if (sectionId) forgetStep(sectionId);
        apply(detail);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Même montant pour l'autre ressort : action explicite, rien n'est inscrit sans ce clic. */
function copySource(line: TaxLine): 'cantonal' | 'federal' | null {
    if (!line.splitsCompetence) return null;
    const cantonal = shownAmount(line, 'cantonal').trim();
    const federal = shownAmount(line, 'federal').trim();
    if (cantonal && cantonal !== federal) return 'cantonal';
    if (federal && !cantonal) return 'federal';
    return null;
}

async function copyAmount(line: TaxLine, from: 'cantonal' | 'federal') {
    const to = from === 'cantonal' ? 'federal' : 'cantonal';
    await commitAmount(line, to, shownAmount(line, from));
}

async function flushCurrentDrafts(): Promise<boolean> {
    const section = currentGroup.value;
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

async function loadDocumentCandidates(id: string) {
    try {
        documentCandidates.value = isImportedReturn(id) ? [] : ((await taxApi.documentCandidates(id)).items ?? []);
    } catch {
        documentCandidates.value = [];
    }
}

/** Pièces proposées pour l'étape ouverte (toutes sur l'étape « Pièces »). */
const stepDocumentCandidates = computed(() => {
    if (step.value === PIECES) return documentCandidates.value;
    const codes = new Set(currentGroup.value?.lines.map((line) => line.code) ?? []);
    return documentCandidates.value.filter((item) => codes.has(item.line));
});

/** Range une pièce proposée sur sa ligne suggérée. */
async function fileCandidate(item: TaxDocumentCandidate) {
    const current = declaration.value;
    if (!current) return;
    apply(await taxApi.attachDocument(current.publicId, item.filePublicId, item.line));
    await loadDocumentCandidates(current.publicId);
    await loadReminders(current.publicId);
}

/** Les rappels dépendent des pièces rangées : on les relit après chaque rangement. */
async function loadReminders(id: string) {
    try {
        reminders.value = isImportedReturn(id) ? [] : ((await taxApi.reminders(id)).items ?? []);
    } catch {
        reminders.value = [];
    }
}

async function loadSuggestions(id: string) {
    try {
        // la bibliothèque et le quota servent au bouton « Sélectionner » ; un échec n'empêche pas l'affichage
        void filesStore.loadList().catch(() => undefined);
        void filesStore.loadUsage().catch(() => undefined);
        // Déclaration importée d'un fichier : seuls les montants lus dans le PDF sont proposés.
        suggestions.value = isImportedReturn(id) ? [] : ((await taxApi.suggestions(id)).items ?? []);
    } catch {
        suggestions.value = [];
    }
    try {
        pillar3a.value = isImportedReturn(id) ? null : await taxApi.pillar3a(id);
    } catch {
        pillar3a.value = null;
    }
    try {
        medical.value = isImportedReturn(id) ? null : await taxApi.medical(id);
    } catch {
        medical.value = null;
    }
    try {
        themes.value = isImportedReturn(id) ? null : await taxApi.themes(id);
    } catch {
        themes.value = null;
    }
    await loadReminders(id);
    await loadDocumentCandidates(id);
}

/** Montants lus dans le PDF importé et pas encore acceptés, rangés par étape (onglet). */
const readByStep = computed(() => {
    const byStep = new Map<string, TaxSuggestion[]>();
    for (const item of readItems.value) {
        const id = groupOf(item.code)?.id;
        if (id) byStep.set(id, [...(byStep.get(id) ?? []), item]);
    }
    return byStep;
});

const stepRead = computed(() => readByStep.value.get(step.value) ?? []);

const stepSuggestions = computed(() => {
    const codes = new Set(currentGroup.value?.lines.map((line) => line.code) ?? []);
    const read = new Set(readItems.value.map(suggestionKey));
    return suggestions.value.filter((item) => codes.has(item.code) && !read.has(suggestionKey(item)));
});

const stepDocuments = computed(() => {
    const docs = declaration.value?.documents ?? [];
    if (step.value === SITUATION) return docs.filter((doc) => !doc.lineCode);
    const codes = new Set(currentGroup.value?.lines.map((line) => line.code) ?? []);
    return docs.filter((doc) => doc.lineCode && codes.has(doc.lineCode));
});

const stepLines = computed(() => currentGroup.value?.lines ?? []);

/** Un montant lu dans le PDF importé garde l'origine « importée » ; les autres sont des propositions de l'application. */
function acceptBody(item: TaxSuggestion): TaxAcceptBody {
    const fromPdf = readItems.value.some((candidate) => suggestionKey(candidate) === suggestionKey(item));
    return {
        code: item.code,
        person: item.person,
        competence: item.competence,
        amount: item.amount,
        origin: fromPdf ? 'importee' : 'propositionAcceptee'
    };
}

async function acceptSuggestion(item: TaxSuggestion) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.acceptSuggestion(current.publicId, acceptBody(item)));
        forgetPendingRead(current.publicId, item.code, item.competence, item.person);
        readItems.value = readItems.value.filter(
            (candidate) => !(candidate.code === item.code && candidate.competence === item.competence && candidate.person === item.person)
        );
        suggestions.value = suggestions.value.filter(
            (candidate) => !(candidate.code === item.code && candidate.competence === item.competence && candidate.person === item.person)
        );
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Accepte plusieurs propositions en une requête : tout est inscrit, ou rien. */
async function acceptMany(items: TaxSuggestion[]) {
    const current = declaration.value;
    if (!current || !items.length) return;
    saving.value = true;
    error.value = '';
    try {
        apply(
            await taxApi.acceptSuggestions(
                current.publicId,
                items.map((item) => acceptBody(item))
            )
        );
        for (const item of items) forgetPendingRead(current.publicId, item.code, item.competence, item.person);
        const accepted = new Set(items.map(suggestionKey));
        readItems.value = readItems.value.filter((candidate) => !accepted.has(suggestionKey(candidate)));
        suggestions.value = suggestions.value.filter((candidate) => !accepted.has(suggestionKey(candidate)));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

function closeReview() {
    const current = declaration.value;
    if (current) dismissReadReport(current.publicId);
    readReport.value = null;
}

const attachedFiles = computed(() => (declaration.value?.documents ?? []).map((doc) => ({ publicId: doc.filePublicId })));

/** Range un fichier de la bibliothèque sur la déclaration (et sur la ligne choisie dans l'étape, s'il y en a une). */
async function attachFile(filePublicId: string) {
    const current = declaration.value;
    if (!current) return;
    apply(await taxApi.attachDocument(current.publicId, filePublicId, step.value === SITUATION ? null : attachLine.value || null));
    await loadReminders(current.publicId);
}

async function onAttachUpload(file: File) {
    const valid = await validatePdfFile(file);
    if (!valid.ok) {
        error.value = t(`filesPage.errors.${valid.code}`);
        return;
    }
    if (filesStore.usage && wouldExceedQuota(filesStore.usage, file.size)) {
        error.value = t('filesPage.errors.quotaExceeded');
        return;
    }
    attaching.value = true;
    error.value = '';
    try {
        const uploaded = await filesStore.uploadFile(file);
        await attachFile(uploaded.publicId);
    } catch (e) {
        const message = getErrorMessage(AppError.fromUnknown(e));
        error.value = isQuotaExceededMessage(message) ? t('filesPage.errors.quotaExceeded') : message;
    } finally {
        attaching.value = false;
    }
}

/** Plusieurs fichiers choisis dans la fenêtre « Sélectionner » : rangés l'un après l'autre. */
async function onAttachMany(files: FileDto[]) {
    saving.value = true;
    error.value = '';
    try {
        for (const file of files) await attachFile(file.publicId);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function detachDocument(documentPublicId: string) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.detachDocument(current.publicId, documentPublicId));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function importStatement(event: Event) {
    const current = declaration.value;
    const input = event.target;
    if (!current || !(input instanceof HTMLInputElement) || !input.files?.[0]) return;
    const xml = await input.files[0].text();
    input.value = '';
    saving.value = true;
    error.value = '';
    try {
        const imported = await taxApi.importStatement(current.publicId, xml);
        const known = new Set(suggestions.value.map((item) => `${item.code}|${item.competence}`));
        suggestions.value = [...suggestions.value, ...imported.items.filter((item) => !known.has(`${item.code}|${item.competence}`))];
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function addFiche(kind: TaxEntryKind, draft: TaxFicheDraft): Promise<boolean> {
    const current = declaration.value;
    if (!current) return false;
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.createEntry(current.publicId, {
            kind,
            person: person.value,
            title: draft.title,
            detail: draft.detail.trim() || null,
            amount: parseFicheAmount(draft.amount),
            secondaryAmount: parseFicheAmount(draft.secondary)
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

async function removeFiche(entryPublicId: string) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.deleteEntry(current.publicId, entryPublicId));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function reportFiches(kind: TaxEntryKind) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.reportEntries(current.publicId, kind, person.value));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
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

/** Déclaration en attente de confirmation de suppression (modale), depuis le détail ou la liste. */
const deleteTarget = ref<{ publicId: string; year: number; canton: string; fromDetail: boolean } | null>(null);
const deleteOpen = computed({
    get: () => deleteTarget.value !== null,
    set: (open: boolean) => {
        if (!open) deleteTarget.value = null;
    }
});

function askRemove(target: { publicId: string; year: number; canton: string }, fromDetail: boolean) {
    if (saving.value) return;
    deleteTarget.value = { publicId: target.publicId, year: target.year, canton: target.canton, fromDetail };
}

async function confirmRemove() {
    const target = deleteTarget.value;
    if (!target || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        await taxApi.remove(target.publicId);
        clearPendingRead(target.publicId);
        deleteTarget.value = null;
        if (target.fromDetail) await router.push(TAX_BASE);
        else await refresh();
    } catch (e) {
        deleteTarget.value = null;
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Ouvre la fiche d'une proposition en retenant cette déclaration : son « Retour » y ramène. */
function openSuggestion(path: string) {
    const current = declaration.value;
    void router.push(current ? withReturnTo(path, taxDetailPath(current.publicId)) : path);
}

function openReturn(id: string) {
    void router.push(taxDetailPath(id));
}

/** Déclaration dont on propose de créer l'année suivante (fenêtre de confirmation). */
const nextYearTarget = ref<{ publicId: string; year: number } | null>(null);
const nextYearOpen = computed({
    get: () => nextYearTarget.value !== null,
    set: (open: boolean) => {
        if (!open) nextYearTarget.value = null;
    }
});

/** L'année suivante s'ouvre au plus tard l'année civile qui la précède. */
const canCreateNextYear = (year: number) => year + 1 <= new Date().getFullYear() + 1;

function askNextYear(target: { publicId: string; year: number }) {
    if (saving.value) return;
    nextYearTarget.value = { publicId: target.publicId, year: target.year };
}

async function confirmNextYear() {
    const target = nextYearTarget.value;
    if (!target || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        // la déclaration d'origine, déchiffrée : ses champs du Coffre sont rechiffrés pour le nouveau dossier
        const source = declaration.value?.publicId === target.publicId ? declaration.value : await taxApi.get(target.publicId);
        const created = await taxApi.createNextYear(target.publicId, null, source);
        nextYearTarget.value = null;
        await router.push(taxDetailPath(created.declaration.publicId));
    } catch (e) {
        nextYearTarget.value = null;
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function toggleChecklist(code: string, complete: boolean) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.updateChecklistItem(current.publicId, code, { complete }));
        forgetStep(PIECES);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

async function generateChecklist() {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.generateChecklist(current.publicId));
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

async function downloadPdf(id: string, year: number, canton: string) {
    error.value = '';
    try {
        saveBlob(await taxApi.pdf(id), `declaration-${year}-${canton}.pdf`);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    }
}

/** Déclaration dont on choisit l'export (fenêtre). */
const exportTarget = ref<{ publicId: string; year: number; canton: string } | null>(null);
const exportOpen = computed({
    get: () => exportTarget.value !== null,
    set: (open: boolean) => {
        if (!open) exportTarget.value = null;
    }
});

function askExport(target: { publicId: string; year: number; canton: string }) {
    if (saving.value) return;
    exportTarget.value = { publicId: target.publicId, year: target.year, canton: target.canton };
}

async function chooseExport(kind: TaxExportKind) {
    const target = exportTarget.value;
    if (!target) return;
    exportTarget.value = null;
    if (kind === 'pdf') await downloadPdf(target.publicId, target.year, target.canton);
    else if (kind === 'bundle') await downloadBundle(target.publicId);
    else await downloadExport(target.publicId, target.year, target.canton, kind);
}

/** Dossier de justificatifs : pièces numérotées dans l'ordre de la déclaration, assemblées sur l'appareil. */
async function downloadBundle(id: string) {
    if (saving.value) return;
    saving.value = true;
    error.value = '';
    notice.value = '';
    try {
        const detail = declaration.value?.publicId === id ? declaration.value : await taxApi.get(id);
        const bundle = await buildTaxBundle(detail, t);
        saveBlob(bundle.blob, bundle.fileName);
        notice.value = bundle.skipped ? t('taxPage.bundle.partial', { count: bundle.skipped }, bundle.skipped) : t('taxPage.bundle.done');
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Export des données (CSV pour un tableur, JSON pour garder tout le dossier). */
async function downloadExport(id: string, year: number, canton: string, format: 'csv' | 'json') {
    error.value = '';
    try {
        saveBlob(await taxApi.exportFile(id, format), `declaration-${year}-${canton}.${format}`);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    }
}

async function setReturnStatus(item: { publicId: string }, status: TaxStatus, submissionDate?: string): Promise<boolean> {
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.get(item.publicId);
        await taxApi.update(item.publicId, {
            canton: detail.canton,
            couple: detail.couple,
            status,
            civilStatus: detail.civilStatus,
            taxationMode: detail.taxationMode,
            taxpayerNumber: detail.taxpayerNumber,
            notes: detail.notes,
            name: detail.name,
            person1: detail.person1,
            person2: detail.person2,
            submissionDate: submissionDate ?? null
        });
        await refresh();
        return true;
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
        return false;
    } finally {
        saving.value = false;
    }
}

/** Déclaration à marquer comme déposée (fenêtre avec la date de dépôt). */
const fileTarget = ref<{ publicId: string; year: number } | null>(null);
const fileOpen = computed({
    get: () => fileTarget.value !== null,
    set: (open: boolean) => {
        if (!open) fileTarget.value = null;
    }
});

function askFile(target: { publicId: string; year: number }) {
    if (saving.value) return;
    error.value = '';
    fileTarget.value = { publicId: target.publicId, year: target.year };
}

async function confirmFile(submissionDate: string) {
    const target = fileTarget.value;
    if (!target || saving.value) return;
    let ok: boolean;
    if (declaration.value?.publicId === target.publicId) {
        // Depuis le détail : l'en-tête affiché (éventuellement modifié) part avec le statut.
        const previous = header.value.status;
        header.value.status = 'deposee';
        ok = await saveHeader(submissionDate);
        if (!ok) header.value.status = previous;
    } else {
        ok = await setReturnStatus(target, 'deposee', submissionDate);
    }
    if (ok) fileTarget.value = null;
}

/** Saisie guidée des totaux : proposée tant que la déclaration n'a aucun montant ni lecture de PDF en attente. */
const guidedTick = ref(0);
const showGuided = computed(() => {
    const current = declaration.value;
    void guidedTick.value;
    if (!current || current.locked || filledCount.value > 0 || readItems.value.length) return false;
    return !isGuidedDismissed(current.publicId);
});
const guidedUnreadImport = computed(() => Boolean(declaration.value && isImportedReturn(declaration.value.publicId) && !readReport.value));
const guidedLines = computed(() => declaration.value?.sections.flatMap((section) => section.lines) ?? []);

function hideGuided() {
    const current = declaration.value;
    if (!current) return;
    dismissGuided(current.publicId);
    guidedTick.value += 1;
}

async function submitGuided(items: TaxAmountItem[]) {
    const current = declaration.value;
    if (!current || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        apply(await taxApi.upsertAmounts(current.publicId, items));
        const lines = new Set(items.map((item) => item.code)).size;
        notice.value = t('taxPage.guided.done', { count: lines }, lines);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Déclaration dont on annule le dépôt (fenêtre de confirmation). */
const unfileTarget = ref<{ publicId: string; year: number } | null>(null);
const unfileOpen = computed({
    get: () => unfileTarget.value !== null,
    set: (open: boolean) => {
        if (!open) unfileTarget.value = null;
    }
});

function askUnfile(target: { publicId: string; year: number }) {
    if (saving.value) return;
    error.value = '';
    unfileTarget.value = { publicId: target.publicId, year: target.year };
}

async function confirmUnfile() {
    const target = unfileTarget.value;
    if (!target || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        const detail = await taxApi.cancelFiling(target.publicId);
        unfileTarget.value = null;
        if (declaration.value?.publicId === target.publicId) apply(detail);
        else await refresh();
    } catch (e) {
        unfileTarget.value = null;
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

/** Ligne en cours de correction (déclaration déposée). */
const correctLine = ref<TaxLine | null>(null);
const correctError = ref('');
const correctOpen = computed({
    get: () => correctLine.value !== null,
    set: (open: boolean) => {
        if (!open) correctLine.value = null;
    }
});

const correctCurrent = computed(() => {
    const line = correctLine.value;
    const out: Partial<Record<TaxCompetence, number>> = {};
    if (!line) return out;
    for (const competence of ['cantonal', 'federal', 'both'] as TaxCompetence[]) {
        const amount = cellAmount(line, competence);
        if (amount != null) out[competence] = amount;
    }
    return out;
});

function correctionsFor(line: TaxLine): TaxCorrection[] {
    return (declaration.value?.corrections ?? []).filter((item) => item.code === line.code && item.person === person.value);
}

function askCorrect(line: TaxLine) {
    if (saving.value) return;
    correctError.value = '';
    correctLine.value = line;
}

async function submitCorrection(payload: TaxCorrectPayload) {
    const current = declaration.value;
    const line = correctLine.value;
    if (!current || !line || saving.value) return;
    saving.value = true;
    correctError.value = '';
    try {
        const detail = await taxApi.correctAmount(current.publicId, {
            code: line.code,
            person: person.value,
            competence: line.splitsCompetence ? payload.competence : null,
            amount: payload.amount,
            reason: payload.reason
        });
        correctLine.value = null;
        apply(detail);
    } catch (e) {
        correctError.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppPageShell v-if="!declaration" :title="t('taxPage.title')" :subtitle="t('taxPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn" @click="openImport()">
                <UploadIcon :size="18" />
                {{ t('taxPage.importExisting') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" @click="openCreate">
                <PlusIcon :size="18" />
                {{ t('taxPage.new') }}
            </button>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>

        <TaxCreateModal v-model="creating" :saving="saving" :error="error" :default-canton="defaultCanton()" @submit="createReturn" />
        <TaxImportModal v-model="importing" :saving="saving" :error="error" :default-canton="defaultCanton()" @submit="importReturn" />

        <p v-if="!loading && !list.length" class="tax-muted">{{ t('taxPage.empty') }}</p>
        <div v-else class="tax-list">
            <TaxReturnCard
                v-for="item in list"
                :key="item.publicId"
                :item="item"
                :saving="saving"
                @open="openReturn(item.publicId)"
                @export="askExport(item)"
                @next="askNextYear(item)"
                @file="askFile(item)"
                @unfile="askUnfile(item)"
                @status="setReturnStatus(item, $event)"
                @remove="askRemove(item, false)"
            />
        </div>
    </AppPageShell>

    <AppPageShell v-else :title="detailTitle" :subtitle="detailSubtitle">
        <template #tabs>
            <nav
                ref="stepsNav"
                class="su-tabs tax-steps"
                :class="{ 'has-more-left': stepsFade.left, 'has-more-right': stepsFade.right }"
                :aria-label="t('taxPage.steps')"
                @scroll.passive="updateStepsFade"
            >
                <button
                    v-for="item in steps"
                    :key="item.id"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': step === item.id, 'is-done': isStepDone(item.id) }"
                    :aria-pressed="step === item.id"
                    :title="item.long"
                    :aria-label="`${item.number} ${item.long}, ${isStepDone(item.id) ? t('taxPage.stepDone') : t('taxPage.stepOpen')}`"
                    @click="step = item.id"
                >
                    <span class="su-tab__label" :data-label="stepTitle(item)">{{ stepTitle(item) }}</span>
                    <span v-if="readByStep.get(item.id)?.length" class="tax-tab-count" :title="t('taxPage.detectedTitle')">
                        {{ readByStep.get(item.id)?.length }}
                    </span>
                    <CheckIcon v-if="isStepDone(item.id)" :size="14" stroke-width="2" aria-hidden="true" />
                </button>
            </nav>
        </template>
        <template #actions>
            <button type="button" class="su-btn" @click="router.push(TAX_BASE)">
                <ArrowLeftIcon :size="18" />
                {{ t('taxPage.back') }}
            </button>
            <button
                v-if="!declaration.locked"
                type="button"
                class="su-btn su-btn--ink"
                :disabled="saving"
                @click="askFile({ publicId: declaration.publicId, year: declaration.year })"
            >
                <CircleCheckIcon :size="18" stroke-width="1.6" />
                {{ t('taxPage.actions.file') }}
            </button>
            <button
                v-else
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="askUnfile({ publicId: declaration.publicId, year: declaration.year })"
            >
                <ArrowBackUpIcon :size="18" stroke-width="1.6" />
                {{ t('taxPage.actions.unfile') }}
            </button>
            <button type="button" class="su-btn" :disabled="saving" @click="askExport(declaration)">
                <DownloadIcon :size="18" stroke-width="1.6" />
                {{ t('taxPage.actions.export') }}
            </button>
            <v-menu location="bottom end" :offset="4">
                <template #activator="{ props: menuProps }">
                    <button v-bind="menuProps" type="button" class="su-btn" :disabled="saving" :aria-label="t('common.more')">
                        <DotsIcon :size="18" stroke-width="1.75" />
                    </button>
                </template>
                <v-sheet class="su-menu tax-actions-menu">
                    <button
                        v-if="canCreateNextYear(declaration.year)"
                        type="button"
                        class="su-menu-item"
                        :disabled="saving"
                        @click="askNextYear({ publicId: declaration.publicId, year: declaration.year })"
                    >
                        <span class="su-menu-item__icon"><ArrowRightIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('taxPage.actions.nextYear', { year: declaration.year + 1 }) }}</span>
                    </button>
                    <div v-if="canCreateNextYear(declaration.year)" class="tax-actions-menu__sep" role="separator" />
                    <button
                        type="button"
                        class="su-menu-item tax-actions-menu__delete"
                        :disabled="saving"
                        @click="askRemove({ publicId: declaration.publicId, year: declaration.year, canton: declaration.canton }, true)"
                    >
                        <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('taxPage.actions.delete') }}</span>
                    </button>
                </v-sheet>
            </v-menu>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
        <p v-if="notice" class="tax-muted">{{ notice }}</p>
        <p v-if="lockedNotice" class="tax-locked" role="status">{{ lockedNotice }}</p>
        <p v-if="profileNotice" class="tax-muted tax-profile-note">{{ profileNotice }}</p>
        <TaxImportReview
            v-if="readReport"
            :profile-label="readReport.profileLabel"
            :scope="readReport.scope"
            :canton="declaration.canton"
            :year="declaration.year"
            :items="readItems"
            :totals="readReport.totals"
            :unmapped="readReport.unmapped"
            @dismiss="closeReview"
        />
        <p v-if="saving" class="tax-muted">{{ t('taxPage.saving') }}</p>

        <TaxHeaderForm
            v-show="step === SITUATION"
            v-model="header"
            :canton-items="cantonItems"
            :status-items="statusItems"
            :canton-locked="filledCount > 0"
            @submit="validateCurrentStep"
        />

        <nav
            v-if="header.couple && step !== SITUATION && step !== PIECES && step !== PAYMENTS"
            class="su-tabs tax-person"
            :aria-label="t('taxPage.person')"
        >
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

        <TaxTotalsEntry
            v-if="step === SITUATION && showGuided"
            :lines="guidedLines"
            :couple="declaration.couple"
            :saving="saving"
            :unread-import="guidedUnreadImport"
            @submit="submitGuided"
            @dismiss="hideGuided"
        />

        <TaxSubtotals v-if="step === SITUATION && visibleSubtotals.length" :rows="visibleSubtotals" />

        <p v-show="step === SITUATION" class="tax-muted">
            {{ t('taxPage.gaps', { count: declaration.gaps.length }, declaration.gaps.length) }}
        </p>

        <TaxReadProposals
            v-if="stepRead.length && !declaration.locked"
            :items="stepRead"
            :saving="saving"
            :can-show="Boolean(readFile)"
            @accept="acceptSuggestion"
            @accept-many="acceptMany"
            @show="zoneItem = $event"
        />

        <TaxPillar3aSection v-if="pillar3a && currentGroup?.lines.some((line) => line.code === 'deduction.pillar3a')" :data="pillar3a" />

        <TaxThemesSection
            v-if="themes && currentGroup?.lines.some((line) => themes?.items.some((item) => item.line === line.code))"
            :data="themes"
            :lines="currentGroup?.lines.map((line) => line.code) ?? []"
        />

        <TaxMedicalSection v-if="medical && currentGroup?.lines.some((line) => line.code === 'deduction.healthGross')" :data="medical" />

        <TaxSuggestionList
            v-if="stepSuggestions.length && !declaration.locked"
            :items="stepSuggestions"
            :saving="saving"
            @accept="acceptSuggestion"
            @see="openSuggestion"
        />

        <TaxChecklistSection
            v-if="step === PIECES"
            :items="declaration.checklist"
            :saving="saving"
            @toggle="toggleChecklist"
            @generate="generateChecklist"
        />

        <TaxInstallmentsSection v-if="step === PAYMENTS" :public-id="declaration.publicId" />

        <TaxRemindersSection v-if="reminders.length && (step === SITUATION || step === PIECES) && !declaration.locked" :items="reminders" />

        <TaxDocumentCandidates
            v-if="stepDocumentCandidates.length && !declaration.locked"
            :items="stepDocumentCandidates"
            :saving="saving"
            @file="fileCandidate"
        />

        <TaxDocumentsSection
            v-if="step !== PIECES && step !== PAYMENTS"
            v-model:attach-line="attachLine"
            :documents="stepDocuments"
            :lines="stepLines"
            :show-line-picker="step !== SITUATION"
            :show-statement="step === 'revenus' || step === 'fortune'"
            :attached="attachedFiles"
            :library="filesStore.items"
            :uploading="attaching"
            :saving="saving"
            @detach="detachDocument"
            @upload="onAttachUpload"
            @pick-many="onAttachMany"
            @statement="importStatement"
        />

        <TaxFichesSection
            v-if="ficheKinds.length"
            :kinds="ficheKinds"
            :entries="declaration.entries"
            :person="person"
            :saving="saving"
            :can-report="!declaration.locked"
            :add="addFiche"
            @remove="removeFiche"
            @report="reportFiches"
        />

        <section v-for="group in groups" v-show="step === group.id" :key="group.id" class="tax-section">
            <TaxLineRow
                v-for="line in group.lines"
                :key="line.code"
                :line="line"
                :shown="shownFor(line)"
                :empty="!line.values.some((value) => value.person === person)"
                :help="helpFor(line)"
                :copy-from="copySource(line)"
                :previous="previousFor(line)"
                :saving="saving"
                :locked="declaration.locked"
                :corrections="correctionsFor(line)"
                @draft="(competence, value) => setDraft(line, competence, value)"
                @commit="(competence) => commitAmount(line, competence, shownAmount(line, competence))"
                @copy="(from) => copyAmount(line, from)"
                @correct="askCorrect(line)"
            />
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

    <TaxExportModal v-model="exportOpen" :saving="saving" :year="exportTarget?.year ?? 0" @choose="chooseExport" />

    <TaxPdfZoneModal v-model="zoneOpen" :file-public-id="readFile" :boxes="zoneItem?.boxes ?? []" :title="zoneItem?.label ?? ''" />

    <TaxFileModal v-model="fileOpen" :saving="saving" :error="error" :year="fileTarget?.year ?? 0" @submit="confirmFile" />

    <TaxCorrectModal
        v-model="correctOpen"
        :line="correctLine"
        :current="correctCurrent"
        :saving="saving"
        :error="correctError"
        @submit="submitCorrection"
    />

    <AppConfirmationModal
        v-model="unfileOpen"
        :title="t('taxPage.unfileModal.title', { year: unfileTarget?.year ?? '' })"
        :message="t('taxPage.unfileModal.message')"
        :confirm-label="t('taxPage.actions.unfile')"
        :loading="saving"
        @confirm="confirmUnfile"
    />

    <AppConfirmationModal
        v-model="nextYearOpen"
        :title="t('taxPage.nextYearModal.title', { year: (nextYearTarget?.year ?? 0) + 1 })"
        :message="t('taxPage.nextYearModal.message')"
        :confirm-label="t('taxPage.nextYearModal.confirm')"
        :loading="saving"
        @confirm="confirmNextYear"
    />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('taxPage.deleteModal.title', { year: deleteTarget?.year ?? '', canton: deleteTarget?.canton ?? '' })"
        :message="t('taxPage.deleteModal.message')"
        :confirm-label="t('taxPage.actions.delete')"
        confirm-color="error"
        :loading="saving"
        @confirm="confirmRemove"
    />
</template>

<style scoped>
.tax-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    margin-left: 6px;
    border-radius: 9px;
    font-size: 11px;
    font-weight: 600;
    background: var(--ink);
    color: var(--paper, #fff);
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
</style>
