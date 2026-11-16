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
    FileTextIcon,
    PencilIcon,
    PlayerPlayIcon,
    HelpCircleIcon,
    PlusIcon,
    ProgressCheckIcon,
    TrashIcon,
    UploadIcon
} from 'vue-tabler-icons';
import { withReturnTo } from '@/utils/helpers/navigation-helpers';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { taxApi } from '@/features/tax/api';
import { buildTaxGroups, migrateValidatedSteps, type TaxGroup } from '@/features/tax/steps';
import { TAX_BASE, taxDetailPath, taxPublicIdFromPath, taxSuggestionTargets } from '@/features/tax/paths';
import {
    TAX_CANTONS,
    type TaxCompetence,
    type TaxEntryKind,
    type TaxIdentity,
    type TaxLine,
    type TaxPerson,
    type TaxReturn,
    type TaxReturnListItem,
    type TaxStatus,
    type TaxSuggestion
} from '@/features/tax/types';
import { filesApi } from '@/features/files';
import { isQuotaExceededMessage, wouldExceedQuota } from '@/features/files/format';
import { useFilesStore } from '@/features/files/stores/files-store';
import type { FileDto } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';
import AttachmentActions from '@/features/transactions/components/forms/AttachmentActions.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const { t, te, locale } = useI18n();
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

const IMPORTED_FLAG = 'spendup.tax.imported';

function readImportedFlag(): string | null {
    try {
        return sessionStorage.getItem(IMPORTED_FLAG);
    } catch {
        return null;
    }
}

function writeImportedFlag(value: string | null) {
    try {
        if (value) sessionStorage.setItem(IMPORTED_FLAG, value);
        else sessionStorage.removeItem(IMPORTED_FLAG);
    } catch {
        /* navigation privée : le message d’import ne survit pas au changement de page */
    }
}

const list = ref<TaxReturnListItem[]>([]);
const declaration = ref<TaxReturn | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const formMode = ref<'create' | 'import' | null>(null);
const year = ref(new Date().getFullYear());
const canton = ref('VD');
const createCouple = ref(false);
const createPerson1 = ref<TaxIdentity>(emptyIdentity());
const createPerson2 = ref<TaxIdentity>(emptyIdentity());
const returnName = ref('');
const importFile = ref<File | null>(null);
const importFileLabel = ref('');
const creating = ref(false);
const person = ref<TaxPerson>('1');
const drafts = ref<Record<string, string>>({});
const suggestions = ref<TaxSuggestion[]>([]);
const filesStore = useFilesStore();
const attaching = ref(false);
const attachLine = ref('');

const cantonItems = TAX_CANTONS.map((code) => ({ title: code, value: code }));
const statusItems = computed(() => STATUSES.map((value) => ({ title: t(`taxPage.statuses.${value}`), value })));

const header = ref({
    name: '',
    canton: 'VD',
    couple: false,
    status: 'enCours' as TaxStatus,
    taxpayerNumber: '',
    notes: '',
    person1: emptyIdentity(),
    person2: emptyIdentity()
});

const detailTitle = computed(() => {
    const current = declaration.value;
    if (!current) return '';
    return current.name?.trim() || `${current.year} · ${current.canton}`;
});

const detailSubtitle = computed(() => {
    const current = declaration.value;
    if (!current?.name?.trim()) return t('taxPage.subtitle');
    return `${current.year} · ${current.canton}`;
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

const groups = computed(() => buildTaxGroups(declaration.value?.sections ?? []));

function stepLabel(group: TaxGroup): string {
    const key = `taxPage.stepLabels.${group.id}`;
    const text = t(key);
    return text === key ? group.fallbackLabel : text;
}

const steps = computed(() => [
    { id: SITUATION, number: 1, label: t('taxPage.identity') },
    ...groups.value.map((group, index) => ({ id: group.id, number: index + 2, label: stepLabel(group) }))
]);

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

function validatedKey(id: string): string {
    return `spendup.tax.validated.${id}`;
}

function loadValidated(id: string) {
    try {
        const raw = localStorage.getItem(validatedKey(id));
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        validated.value = Array.isArray(parsed)
            ? migrateValidatedSteps(parsed.filter((item): item is string => typeof item === 'string'))
            : [];
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

const ficheKinds = computed((): TaxEntryKind[] => {
    if (step.value === SITUATION) return ['child'];
    if (step.value === 'revenus') return ['employment'];
    if (step.value === 'fortune') return ['property', 'institution'];
    if (step.value === 'dettes') return ['debt'];
    return [];
});

const ficheDrafts = ref<Record<string, { title: string; detail: string; amount: string; secondary: string }>>({});

function ficheDraft(kind: string) {
    if (!ficheDrafts.value[kind]) {
        ficheDrafts.value[kind] = { title: '', detail: '', amount: '', secondary: '' };
    }
    return ficheDrafts.value[kind];
}

function entriesOf(kind: TaxEntryKind) {
    return (declaration.value?.entries ?? []).filter((entry) => entry.kind === kind && entry.person === person.value);
}

function amountLabel(kind: TaxEntryKind): string {
    if (kind === 'employment') return t('taxPage.fiches.employmentAmount');
    if (kind === 'property') return t('taxPage.fiches.propertyAmount');
    if (kind === 'debt') return t('taxPage.fiches.debtAmount');
    if (kind === 'institution') return t('taxPage.fiches.institutionAmount');
    return t('taxPage.fiches.amount');
}

function secondaryLabel(kind: TaxEntryKind): string {
    if (kind === 'property') return t('taxPage.fiches.propertyIncome');
    if (kind === 'debt') return t('taxPage.fiches.debtInterest');
    if (kind === 'institution') return t('taxPage.fiches.institutionIncome');
    return '';
}

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
            validated.value = [];
            const result = await taxApi.list();
            list.value = result.items;
            return;
        }
        loadValidated(publicId.value);
        const detail = await taxApi.get(publicId.value);
        apply(detail);
        await loadSuggestions(publicId.value);
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

function apply(detail: TaxReturn) {
    declaration.value = detail;
    headerSync = true;
    header.value = {
        name: detail.name ?? '',
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

function openCreate() {
    error.value = '';
    year.value = new Date().getFullYear();
    returnName.value = '';
    formMode.value = null;
    createCouple.value = false;
    createPerson1.value = emptyIdentity();
    createPerson2.value = emptyIdentity();
    creating.value = true;
}

function openImport() {
    formMode.value = formMode.value === 'import' ? null : 'import';
    error.value = '';
}

function closeForm() {
    formMode.value = null;
    importFile.value = null;
    importFileLabel.value = '';
}

function onImportFile(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
        importFile.value = null;
        importFileLabel.value = '';
        return;
    }
    importFile.value = input.files[0];
    importFileLabel.value = input.files[0].name;
}

async function createReturn() {
    if (saving.value) return;
    saving.value = true;
    error.value = '';
    try {
        const created = await taxApi.create(year.value, canton.value, returnName.value.trim() || null);
        const person1 = cleanIdentity(createPerson1.value);
        const hasIdentity = Object.values(person1).some(Boolean) || createCouple.value;
        if (hasIdentity) {
            const base = created.declaration;
            await taxApi.update(base.publicId, {
                canton: base.canton,
                couple: createCouple.value,
                status: base.status,
                taxpayerNumber: base.taxpayerNumber,
                notes: base.notes,
                name: base.name,
                person1,
                person2: createCouple.value ? cleanIdentity(createPerson2.value) : null
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

async function importReturn() {
    const file = importFile.value;
    if (!file) {
        error.value = t('taxPage.importFileRequired');
        return;
    }
    saving.value = true;
    error.value = '';
    let createdId = '';
    try {
        const created = await taxApi.create(year.value, canton.value, returnName.value.trim() || null);
        createdId = created.declaration.publicId;
        const uploaded = await filesApi.upload(file);
        await taxApi.attachDocument(createdId, uploaded.publicId, null);
        writeImportedFlag(createdId);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
    if (!createdId) return;
    const failure = error.value;
    closeForm();
    if (!failure) {
        await router.push(taxDetailPath(createdId));
        return;
    }
    await refresh();
    error.value = failure;
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
            name: header.value.name.trim() || null,
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
    const sectionId = groupOf(line.code)?.id;
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

async function loadSuggestions(id: string) {
    try {
        // la bibliothèque et le quota servent au bouton « Sélectionner » ; un échec n'empêche pas l'affichage
        void filesStore.loadList().catch(() => undefined);
        void filesStore.loadUsage().catch(() => undefined);
        const suggested = await taxApi.suggestions(id);
        suggestions.value = suggested.items ?? [];
    } catch {
        suggestions.value = [];
    }
}

const stepSuggestions = computed(() => {
    const codes = new Set(currentGroup.value?.lines.map((line) => line.code) ?? []);
    return suggestions.value.filter((item) => codes.has(item.code));
});

const stepDocuments = computed(() => {
    const docs = declaration.value?.documents ?? [];
    if (step.value === SITUATION) return docs.filter((doc) => !doc.lineCode);
    const codes = new Set(currentGroup.value?.lines.map((line) => line.code) ?? []);
    return docs.filter((doc) => doc.lineCode && codes.has(doc.lineCode));
});

const stepLines = computed(() => currentGroup.value?.lines ?? []);

async function acceptSuggestion(item: TaxSuggestion) {
    const current = declaration.value;
    if (!current) return;
    saving.value = true;
    error.value = '';
    try {
        apply(
            await taxApi.acceptSuggestion(current.publicId, {
                code: item.code,
                person: item.person,
                competence: item.competence,
                amount: item.amount
            })
        );
        suggestions.value = suggestions.value.filter(
            (candidate) => !(candidate.code === item.code && candidate.competence === item.competence)
        );
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

const attachedFiles = computed(() => (declaration.value?.documents ?? []).map((doc) => ({ publicId: doc.filePublicId })));

/** Range un fichier de la bibliothèque sur la déclaration (et sur la ligne choisie dans l'étape, s'il y en a une). */
async function attachFile(filePublicId: string) {
    const current = declaration.value;
    if (!current) return;
    apply(await taxApi.attachDocument(current.publicId, filePublicId, step.value === SITUATION ? null : attachLine.value || null));
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

async function addFiche(kind: TaxEntryKind) {
    const current = declaration.value;
    if (!current) return;
    const draft = ficheDraft(kind);
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
        draft.title = '';
        draft.detail = '';
        draft.amount = '';
        draft.secondary = '';
        apply(detail);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
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

async function downloadPdf(id: string, year: number, canton: string) {
    error.value = '';
    try {
        const blob = await taxApi.pdf(id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `declaration-${year}-${canton}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    }
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
            name: detail.name,
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

function money(value: number | null): string {
    if (value == null) return t('common.emptyValue');
    return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'CHF' }).format(value);
}
</script>

<template>
    <AppPageShell v-if="!declaration" :title="t('taxPage.title')" :subtitle="t('taxPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn" :class="{ 'is-active': formMode === 'import' }" @click="openImport()">
                <UploadIcon :size="18" />
                {{ t('taxPage.importExisting') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" @click="openCreate">
                <PlusIcon :size="18" />
                {{ t('taxPage.new') }}
            </button>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
        <p v-if="loading" class="tax-muted">{{ t('taxPage.loading') }}</p>

        <AppModalBase
            v-model="creating"
            :title="t('taxPage.createModal.title')"
            :subtitle="t('taxPage.createModal.subtitle')"
            :max-width="560"
            :height="640"
            scrollable
            mobile-layout="fullscreen"
        >
            <form id="tax-create-form" class="tax-form tax-form--modal" @submit.prevent="createReturn">
                <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-name">{{ t('taxPage.name') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-create-name"
                            v-model="returnName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="80"
                            :placeholder="t('taxPage.namePlaceholder')"
                        />
                    </div>
                </div>
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
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-couple">{{ t('taxPage.couple') }}</label>
                    <div class="tax-form__field">
                        <AppSwitch id="tax-create-couple" v-model="createCouple" />
                    </div>
                </div>

                <h3 class="tax-form__legend">{{ t('taxPage.createModal.person1') }}</h3>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-p1-name">{{ t('taxPage.officialName') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-create-p1-name"
                            v-model="createPerson1.officialName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-p1-first">{{ t('taxPage.firstName') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-create-p1-first"
                            v-model="createPerson1.firstName"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-p1-city">{{ t('taxPage.municipality') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-create-p1-city"
                            v-model="createPerson1.municipality"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>
                <div class="tax-form__row">
                    <label class="tax-form__label" for="tax-create-p1-job">{{ t('taxPage.job') }}</label>
                    <div class="tax-form__field">
                        <v-text-field
                            id="tax-create-p1-job"
                            v-model="createPerson1.job"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            maxlength="100"
                        />
                    </div>
                </div>

                <template v-if="createCouple">
                    <h3 class="tax-form__legend">{{ t('taxPage.createModal.person2') }}</h3>
                    <div class="tax-form__row">
                        <label class="tax-form__label" for="tax-create-p2-name">{{ t('taxPage.officialName') }}</label>
                        <div class="tax-form__field">
                            <v-text-field
                                id="tax-create-p2-name"
                                v-model="createPerson2.officialName"
                                color="primary"
                                variant="outlined"
                                hide-details="auto"
                                maxlength="100"
                            />
                        </div>
                    </div>
                    <div class="tax-form__row">
                        <label class="tax-form__label" for="tax-create-p2-first">{{ t('taxPage.firstName') }}</label>
                        <div class="tax-form__field">
                            <v-text-field
                                id="tax-create-p2-first"
                                v-model="createPerson2.firstName"
                                color="primary"
                                variant="outlined"
                                hide-details="auto"
                                maxlength="100"
                            />
                        </div>
                    </div>
                </template>
            </form>

            <template #footer="{ close }">
                <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                    {{ t('taxPage.cancel') }}
                </button>
                <button type="submit" form="tax-create-form" class="su-btn su-btn--ink" :disabled="saving">
                    {{ t('taxPage.create') }}
                </button>
            </template>
        </AppModalBase>

        <form v-if="formMode === 'import'" class="tax-form" @submit.prevent="importReturn()">
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-name">{{ t('taxPage.name') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-import-name"
                        v-model="returnName"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="80"
                        :placeholder="t('taxPage.namePlaceholder')"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-year">{{ t('taxPage.year') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-import-year"
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
                <label class="tax-form__label" for="tax-import-canton">{{ t('taxPage.canton') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        id="tax-import-canton"
                        v-model="canton"
                        :items="cantonItems"
                        :label="t('taxPage.canton')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-import-file">{{ t('taxPage.importFile') }}</label>
                <div class="tax-form__field">
                    <input id="tax-import-file" class="tax-import-file" type="file" accept="application/pdf,.pdf" @change="onImportFile" />
                    <p v-if="importFileLabel" class="tax-muted">{{ importFileLabel }}</p>
                </div>
            </div>
            <div class="tax-form__actions">
                <button type="submit" class="su-btn su-btn--ink" :disabled="saving">{{ t('taxPage.import') }}</button>
                <button type="button" class="su-btn" @click="closeForm">{{ t('taxPage.cancel') }}</button>
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
                    <p class="tax-card__kicker">{{ item.name?.trim() ? `${item.year} · ${item.canton}` : item.canton }}</p>
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
                                    type="button"
                                    class="su-menu-item"
                                    :disabled="saving"
                                    @click="downloadPdf(item.publicId, item.year, item.canton)"
                                >
                                    <span class="su-menu-item__icon"><FileTextIcon :size="18" stroke-width="1.6" /></span>
                                    <span class="su-menu-item__title">{{ t('taxPage.actions.pdf') }}</span>
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
                                    @click="askRemove(item, false)"
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
                <h3 class="tax-card__name">{{ item.name?.trim() || item.year }}</h3>
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

    <AppPageShell v-else :title="detailTitle" :subtitle="detailSubtitle">
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
            <button
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="downloadPdf(declaration.publicId, declaration.year, declaration.canton)"
            >
                <FileTextIcon :size="18" stroke-width="1.6" />
                {{ t('taxPage.actions.pdf') }}
            </button>
            <button
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="askRemove({ publicId: declaration.publicId, year: declaration.year, canton: declaration.canton }, true)"
            >
                {{ t('taxPage.delete') }}
            </button>
        </template>

        <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
        <p v-if="notice" class="tax-muted">{{ notice }}</p>
        <p v-if="saving" class="tax-muted">{{ t('taxPage.saving') }}</p>

        <form v-show="step === SITUATION" class="tax-form" @submit.prevent="validateCurrentStep">
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-name">{{ t('taxPage.name') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-name"
                        v-model="header.name"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        maxlength="80"
                        :placeholder="t('taxPage.namePlaceholder')"
                    />
                </div>
            </div>
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
                <div class="tax-form__field tax-form__field--wide">
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

        <section v-if="stepSuggestions.length" class="tax-form">
            <h2 class="tax-form__legend">{{ t('taxPage.suggestionsTitle') }}</h2>
            <article v-for="item in stepSuggestions" :key="`${item.code}-${item.competence}`" class="tax-fiche">
                <div>
                    <p class="tax-fiche__title">{{ item.label }}</p>
                    <p class="tax-fiche__detail">{{ item.originLabel }}</p>
                </div>
                <p class="tax-fiche__amount">{{ money(item.amount) }}</p>
                <button
                    v-if="taxSuggestionTargets(item).length === 1"
                    type="button"
                    class="su-btn su-btn--ghost"
                    :disabled="saving"
                    @click="openSuggestion(taxSuggestionTargets(item)[0].path)"
                >
                    {{ t('taxPage.see') }}
                </button>
                <v-menu v-else-if="taxSuggestionTargets(item).length > 1" location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-btn su-btn--ghost" :disabled="saving">
                            {{ t('taxPage.see') }}
                        </button>
                    </template>
                    <v-sheet class="su-menu tax-actions-menu">
                        <button
                            v-for="target in taxSuggestionTargets(item)"
                            :key="target.path"
                            type="button"
                            class="su-menu-item"
                            @click="openSuggestion(target.path)"
                        >
                            <span class="su-menu-item__title">{{ target.name }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
                <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="acceptSuggestion(item)">
                    {{ t('taxPage.accept') }}
                </button>
            </article>
        </section>

        <section class="tax-form">
            <h2 class="tax-form__legend">{{ t('taxPage.documentsTitle') }}</h2>
            <article v-for="doc in stepDocuments" :key="doc.publicId" class="tax-fiche">
                <p class="tax-fiche__title">{{ doc.fileName }}</p>
                <button type="button" class="su-btn" :disabled="saving" @click="detachDocument(doc.publicId)">
                    {{ t('taxPage.fiches.remove') }}
                </button>
            </article>
            <div v-if="step !== SITUATION" class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.attachLine') }}</label>
                <div class="tax-form__field">
                    <AppSelect
                        v-model="attachLine"
                        :items="stepLines.map((line) => ({ title: line.label, value: line.code }))"
                        :label="t('taxPage.line')"
                        hide-details="auto"
                    />
                </div>
            </div>
            <div class="tax-form__actions">
                <AttachmentActions
                    split
                    :attached="attachedFiles"
                    :library="filesStore.items"
                    :uploading="attaching"
                    :acting="saving"
                    :max="50"
                    :upload-label="t('taxPage.attachUpload')"
                    :select-label="t('taxPage.attachSelect')"
                    @upload="onAttachUpload"
                    @pick-many="onAttachMany"
                />
                <label v-if="step === 'revenus' || step === 'fortune'" class="su-btn">
                    {{ t('taxPage.importStatement') }}
                    <input class="tax-file" type="file" accept=".xml,text/xml" @change="importStatement" />
                </label>
            </div>
        </section>

        <div v-if="ficheKinds.length" class="tax-fiches">
            <section v-for="kind in ficheKinds" :key="kind" class="tax-form">
                <h2 class="tax-form__legend">{{ t(`taxPage.fiches.${kind}`) }}</h2>
                <article v-for="entry in entriesOf(kind)" :key="entry.publicId" class="tax-fiche">
                    <div>
                        <p class="tax-fiche__title">{{ entry.title }}</p>
                        <p v-if="entry.detail" class="tax-fiche__detail">{{ entry.detail }}</p>
                    </div>
                    <p v-if="entry.amount != null" class="tax-fiche__amount">{{ money(entry.amount) }}</p>
                    <p v-if="entry.secondaryAmount != null" class="tax-fiche__amount">{{ money(entry.secondaryAmount) }}</p>
                    <button type="button" class="su-btn" :disabled="saving" @click="removeFiche(entry.publicId)">
                        {{ t('taxPage.fiches.remove') }}
                    </button>
                </article>
                <form class="tax-form" @submit.prevent="addFiche(kind)">
                    <div class="tax-form__row">
                        <label class="tax-form__label">{{ t('taxPage.fiches.title') }}</label>
                        <div class="tax-form__field">
                            <v-text-field v-model="ficheDraft(kind).title" color="primary" variant="outlined" hide-details />
                        </div>
                    </div>
                    <div class="tax-form__row">
                        <label class="tax-form__label">{{ t('taxPage.fiches.detail') }}</label>
                        <div class="tax-form__field">
                            <v-text-field v-model="ficheDraft(kind).detail" color="primary" variant="outlined" hide-details />
                        </div>
                    </div>
                    <div v-if="kind !== 'child'" class="tax-form__row">
                        <label class="tax-form__label">{{ amountLabel(kind) }}</label>
                        <div class="tax-form__field">
                            <v-text-field v-model="ficheDraft(kind).amount" color="primary" variant="outlined" hide-details />
                        </div>
                    </div>
                    <div v-if="secondaryLabel(kind)" class="tax-form__row">
                        <label class="tax-form__label">{{ secondaryLabel(kind) }}</label>
                        <div class="tax-form__field">
                            <v-text-field v-model="ficheDraft(kind).secondary" color="primary" variant="outlined" hide-details />
                        </div>
                    </div>
                    <div class="tax-form__actions">
                        <button type="submit" class="su-btn" :disabled="saving">{{ t('taxPage.fiches.save') }}</button>
                        <button
                            v-if="kind !== 'child'"
                            type="button"
                            class="su-btn su-btn--ink"
                            :disabled="saving"
                            @click="reportFiches(kind)"
                        >
                            {{ t('taxPage.fiches.report') }}
                        </button>
                    </div>
                </form>
            </section>
        </div>

        <section v-for="group in groups" v-show="step === group.id" :key="group.id" class="tax-section">
            <div
                v-for="line in group.lines"
                :key="line.code"
                class="tax-form tax-line"
                :class="{ 'is-empty': !line.values.some((value) => value.person === person) }"
            >
                <div v-if="line.splitsCompetence" class="tax-form__row">
                    <p class="tax-form__label">
                        {{ line.label }}
                        <span v-if="helpFor(line)" class="tax-help">
                            <button type="button" class="tax-help__btn" :aria-label="helpFor(line)">
                                <HelpCircleIcon :size="16" stroke-width="1.8" aria-hidden="true" />
                            </button>
                            <v-tooltip activator="parent" location="top" open-delay="100" content-class="tax-help__tip">
                                <v-chip class="tax-help__chip" color="primary" variant="flat" label>{{ helpFor(line) }}</v-chip>
                            </v-tooltip>
                        </span>
                    </p>
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
                    <template v-if="copySource(line)">
                        <span />
                        <button
                            type="button"
                            class="su-btn su-btn--ghost tax-copy"
                            :disabled="saving"
                            @click="copyAmount(line, copySource(line)!)"
                        >
                            {{ copySource(line) === 'cantonal' ? t('taxPage.simple.copyToFederal') : t('taxPage.simple.copyToCantonal') }}
                        </button>
                    </template>
                </div>
                <div v-else class="tax-form__row">
                    <label class="tax-form__label" :for="`tax-line-${line.code}`">
                        {{ line.label }}
                        <span v-if="helpFor(line)" class="tax-help">
                            <button type="button" class="tax-help__btn" :aria-label="helpFor(line)">
                                <HelpCircleIcon :size="16" stroke-width="1.8" aria-hidden="true" />
                            </button>
                            <v-tooltip activator="parent" location="top" open-delay="100" content-class="tax-help__tip">
                                <v-chip class="tax-help__chip" color="primary" variant="flat" label>{{ helpFor(line) }}</v-chip>
                            </v-tooltip>
                        </span>
                    </label>
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
    max-width: 380px;
}

.tax-form__field--wide {
    max-width: 560px;
}

/* Un montant tient en quelques chiffres : pas besoin de la largeur du formulaire. */
.tax-line .tax-form__field {
    max-width: 240px;
}

.tax-line .tax-form__split {
    max-width: 480px;
}

.tax-import-file {
    font: inherit;
    font-size: 14px;
    color: var(--ink);
}

.tax-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.tax-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.tax-form--modal {
    margin-bottom: 0;
}

.tax-form__split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    max-width: 520px;
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

.tax-help {
    display: inline-flex;
    vertical-align: middle;
    margin-left: 4px;
}

.tax-help__btn {
    display: inline-flex;
    padding: 2px;
    border: 0;
    background: none;
    color: var(--gray);
    cursor: help;
}

.tax-help__btn:hover,
.tax-help__btn:focus-visible {
    color: var(--ink);
}

/* le chip est une pastille de texte, pas une étiquette d'une ligne */
.tax-help__chip {
    height: auto;
    max-width: 320px;
    padding: 8px 12px;
    white-space: normal;
    line-height: 1.35;
}

.tax-copy {
    align-self: flex-start;
    justify-self: start;
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

.tax-fiches {
    display: flex;
    flex-direction: column;
    gap: 28px;
    margin-bottom: 28px;
}

.tax-fiche {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.tax-file {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
}

.tax-fiche__title {
    margin: 0;
    font-weight: 700;
}

.tax-fiche__detail,
.tax-fiche__amount {
    margin: 0;
    color: var(--gray);
    font-variant-numeric: tabular-nums;
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

    .tax-form__field,
    .tax-form__field--wide,
    .tax-line .tax-form__field,
    .tax-form__split,
    .tax-line .tax-form__split {
        max-width: none;
    }
}
</style>
