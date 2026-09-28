import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { ImportChangedPayload } from '@/features/notifications';
import type { Import, ImportLine } from '@/features/imports/types';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    listLines: vi.fn(),
    updateLine: vi.fn(),
    bulkUpdateLines: vi.fn(),
    reparse: vi.fn(),
    preview: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn(),
    revert: vi.fn(),
    remove: vi.fn(),
    saveAsTemplate: vi.fn()
}));

const templatesApi = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const notifications = vi.hoisted(() => ({
    importListener: null as ((payload: ImportChangedPayload) => void) | null,
    subscribeToImportChanged: vi.fn(),
    subscribeToImportTemplateChanged: vi.fn(),
    dispatchLocalAccountChanged: vi.fn()
}));

vi.mock('@/features/imports/api', () => ({
    importsApi: api,
    importTemplatesApi: templatesApi
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => notifications
}));

import { useImportsStore } from '@/features/imports/stores/imports-store';

function makeImport(partial: Partial<Import> = {}): Import {
    return {
        publicId: 'imp-1',
        accountPublicId: 'acc-1',
        accountName: 'Courant',
        accountCurrency: 'CHF',
        fileName: 'releve.csv',
        sourceType: 'csv',
        status: 'aValider',
        templatePublicId: null,
        counts: { total: 2, validated: 1, toReview: 1, errors: 0, ignored: 0 },
        periodFrom: '2026-07-01',
        periodTo: '2026-07-31',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: null,
        validatedAt: null,
        expiresAt: '2026-10-01T10:00:00Z',
        analysis: {
            encoding: 'utf-8',
            separator: ';',
            sheetNames: [],
            sheetName: null,
            headerRow: 1,
            columns: [],
            sample: [],
            mapping: null,
            errors: [],
            warnings: [],
            suggestedTemplates: []
        },
        ...partial
    };
}

function makeLine(partial: Partial<ImportLine> = {}): ImportLine {
    return {
        publicId: 'l-1',
        lineNumber: 2,
        status: 'aValider',
        operationDate: '2026-07-01',
        valueDate: null,
        label: 'Migros',
        amount: -45.3,
        type: 'depense',
        currency: 'CHF',
        balance: null,
        categoryPublicId: null,
        categorySuggested: false,
        unmatchedCategoryName: null,
        tierPublicId: null,
        unmatchedTierName: null,
        duplicateOfTransactionPublicId: 'tx-1',
        duplicateOfLineNumber: null,
        isEdited: false,
        transactionPublicId: null,
        issues: [],
        original: null,
        ...partial
    };
}

async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useImportsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        Object.values(templatesApi).forEach((mock) => mock.mockReset());
        notifications.importListener = null;
        notifications.subscribeToImportChanged.mockReset().mockImplementation((listener) => {
            notifications.importListener = listener;
            return () => undefined;
        });
        notifications.subscribeToImportTemplateChanged.mockReset().mockReturnValue(() => undefined);
        notifications.dispatchLocalAccountChanged.mockReset();
    });

    it('charge l’historique filtré', async () => {
        api.list.mockResolvedValue({ items: [makeImport()], page: 1, pageSize: 20, totalCount: 1 });
        const store = useImportsStore();
        await store.loadList({ status: 'aValider' });
        expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'aValider', page: 1 }));
        expect(store.items).toHaveLength(1);
        expect(store.totalCount).toBe(1);
        expect(store.initialized).toBe(true);
    });

    it('ouvre un import en revue et charge ses lignes', async () => {
        api.get.mockResolvedValue(makeImport());
        api.listLines.mockResolvedValue({ items: [makeLine()], page: 1, pageSize: 50, totalCount: 1 });
        const store = useImportsStore();
        await store.openImport('imp-1');
        expect(store.current?.publicId).toBe('imp-1');
        expect(api.listLines).toHaveBeenCalledWith('imp-1', expect.objectContaining({ sort: 'lineNumber', page: 1 }));
        expect(store.lines).toHaveLength(1);
    });

    it('n’appelle pas les lignes pour un import à mapper', async () => {
        api.get.mockResolvedValue(makeImport({ status: 'erreur' }));
        const store = useImportsStore();
        await store.openImport('imp-1');
        expect(api.listLines).not.toHaveBeenCalled();
    });

    it('404 à l’ouverture : import marqué disparu', async () => {
        api.get.mockRejectedValue(new AppError('Introuvable', 404));
        const store = useImportsStore();
        await expect(store.openImport('imp-x')).rejects.toBeInstanceOf(AppError);
        expect(store.currentGone).toBe(true);
    });

    it('corrige une ligne puis relit les compteurs', async () => {
        api.get.mockResolvedValue(makeImport());
        api.listLines.mockResolvedValue({ items: [makeLine()], page: 1, pageSize: 50, totalCount: 1 });
        const store = useImportsStore();
        await store.openImport('imp-1');

        api.updateLine.mockResolvedValue(makeLine({ status: 'validee' }));
        api.get.mockResolvedValue(makeImport({ counts: { total: 2, validated: 2, toReview: 0, errors: 0, ignored: 0 } }));
        await store.updateLine('l-1', { status: 'validee' });

        expect(api.updateLine).toHaveBeenCalledWith('imp-1', 'l-1', { status: 'validee' });
        expect(store.lines[0].status).toBe('validee');
        expect(store.current?.counts.toReview).toBe(0);
    });

    it('commit : statut validé et accountChanged rejoué localement', async () => {
        api.get.mockResolvedValue(makeImport());
        api.listLines.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        const store = useImportsStore();
        await store.openImport('imp-1');

        api.commit.mockResolvedValue({ import: makeImport({ status: 'valide', expiresAt: null }), createdTransactions: 2 });
        const result = await store.commitImport('imp-1', { ignoreUnresolved: true });

        expect(api.commit).toHaveBeenCalledWith('imp-1', true);
        expect(result.createdTransactions).toBe(2);
        expect(store.current?.status).toBe('valide');
        expect(notifications.dispatchLocalAccountChanged).toHaveBeenCalledWith({
            change: 'transactionsImported',
            accountPublicId: 'acc-1'
        });
    });

    it('revert : rejoue transactionsReverted', async () => {
        const store = useImportsStore();
        api.revert.mockResolvedValue({ import: makeImport({ status: 'annule' }), revertedTransactions: 3 });
        const result = await store.revertImport('imp-1');
        expect(result.revertedTransactions).toBe(3);
        expect(notifications.dispatchLocalAccountChanged).toHaveBeenCalledWith({
            change: 'transactionsReverted',
            accountPublicId: 'acc-1'
        });
    });

    it('ignore l’écho SignalR de sa propre mutation, relit celui d’un autre onglet', async () => {
        api.get.mockResolvedValue(makeImport());
        api.listLines.mockResolvedValue({ items: [makeLine()], page: 1, pageSize: 50, totalCount: 1 });
        const store = useImportsStore();
        store.onAuthenticatedSession();
        await store.openImport('imp-1');

        api.cancel.mockResolvedValue(makeImport({ status: 'annule' }));
        await store.cancelImport('imp-1');
        api.get.mockClear();

        notifications.importListener?.({ change: 'importCancelled', importPublicId: 'imp-1' });
        await flushMicrotasks();
        expect(api.get).not.toHaveBeenCalled();

        notifications.importListener?.({ change: 'importUpdated', importPublicId: 'imp-1' });
        await flushMicrotasks();
        expect(api.get).toHaveBeenCalledWith('imp-1');
    });

    it('importDeleted d’ailleurs : import ouvert marqué disparu', async () => {
        api.get.mockResolvedValue(makeImport({ status: 'erreur' }));
        const store = useImportsStore();
        store.onAuthenticatedSession();
        await store.openImport('imp-1');
        notifications.importListener?.({ change: 'importDeleted', importPublicId: 'imp-1' });
        expect(store.currentGone).toBe(true);
    });

    it('supprime un import de l’historique', async () => {
        api.list.mockResolvedValue({ items: [makeImport({ status: 'annule' })], page: 1, pageSize: 20, totalCount: 1 });
        api.remove.mockResolvedValue(undefined);
        const store = useImportsStore();
        await store.loadList();
        await store.deleteImport('imp-1');
        expect(store.items).toHaveLength(0);
        expect(store.totalCount).toBe(0);
    });

    it('met à jour un modèle en renvoyant son mapping intact', async () => {
        const template = {
            publicId: 'tpl-1',
            name: 'UBS',
            sourceType: 'csv' as const,
            isSystem: false,
            isActive: true,
            bankTierPublicId: null,
            description: null,
            mapping: { separator: ';' },
            createdAt: null,
            updatedAt: null
        };
        templatesApi.list.mockResolvedValue({ items: [template], totalCount: 1 });
        templatesApi.update.mockResolvedValue({ ...template, isActive: false });
        const store = useImportsStore();
        await store.loadTemplates();
        await store.updateTemplate(template, { isActive: false });
        expect(templatesApi.update).toHaveBeenCalledWith('tpl-1', {
            name: 'UBS',
            mapping: { separator: ';' },
            bankTierPublicId: null,
            isActive: false
        });
        expect(store.templates[0].isActive).toBe(false);
    });
});
