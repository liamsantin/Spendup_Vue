import { AppError } from '@/utils/errors/app-error';
import type { CreateAliasPayload, UpdateAliasPayload } from '@/features/aliases/types';
import type { CreateAccountPayload, UpdateAccountPayload } from '@/features/accounts/types';
import type {
    Asset,
    CreateAssetPayload,
    SaveAssetValuationPayload,
    SaveVehicleMaintenancePayload,
    SaveVehicleMileagePayload,
    UpdateAssetPayload
} from '@/features/assets/types';
import type { CreatePaymentMethodPayload, UpdatePaymentMethodPayload } from '@/features/payment-methods/types';
import type { CreateTierPayload, TierBankPayload, UpdateTierPayload } from '@/features/tiers/types';
import type { CreateBudgetPayload, UpdateBudgetPayload } from '@/features/budgets/types';
import type { CreateCategoryPayload, UpdateCategoryPayload } from '@/features/categories/types';
import type { CreateSavingsGoalPayload, UpdateSavingsGoalPayload } from '@/features/savings-goals/types';
import type { CreateTransactionPayload, UpdateTransactionPayload } from '@/features/transactions/types';
import type { UserSettings } from '@/features/user-settings/types';
import { DEMO_USER_PUBLIC_ID } from '@/features/demo/user';
import { mortgageRemainingFor, routeWealth } from '@/features/demo/wealth';
import { routeTax } from '@/features/demo/tax';
import type { UpdateFileRequest } from '@/features/files/types';
import {
    demoFileContent,
    demoFileUsage,
    findDemoFile,
    readUploadedFile,
    removeDemoFile,
    updateDemoFile,
    uploadDemoFile
} from '@/features/demo/files';
import { matchesFriendSearch, toBlockedItem, toFriendItem, toRequestItem, toSearchItem, type DemoFriend } from '@/features/demo/friends';
import {
    duesFromExpense,
    duesFromIncome,
    expenseFromPayload,
    incomeFromPayload,
    refreshExpenseUpcoming,
    refreshIncomeUpcoming
} from '@/features/demo/recurring';
import type { CreateRecurringExpensePayload, CreateRecurringIncomePayload, RecurringDue } from '@/features/recurring-payments/types';
import {
    DEMO_BANKS,
    applyMovement,
    buildMovements,
    createPublicId,
    currencyOr,
    demoDb,
    emptyPage,
    netWorthOverview,
    netWorthSnapshots,
    pageOf,
    periodBounds,
    refreshBudgets,
    refreshGoals
} from '@/features/demo/db';

type DemoResult = { status: number; body: unknown };

function notFound(message = 'Introuvable.'): never {
    throw new AppError(message, 404);
}

function locked(): never {
    throw new AppError('Disponible avec un compte.', 403);
}

function pathOf(url: string): { path: string; query: URLSearchParams } {
    const raw = url.startsWith('http://') || url.startsWith('https://') ? new URL(url).pathname + new URL(url).search : url;
    const [path, qs = ''] = raw.split('?');
    const normalized = path.replace(/\/+$/, '') || '/';
    return { path: normalized, query: new URLSearchParams(qs) };
}

function match(path: string, pattern: string): Record<string, string> | null {
    const actual = path.split('/').filter(Boolean);
    const expected = pattern.split('/').filter(Boolean);
    if (actual.length !== expected.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < expected.length; i += 1) {
        if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
        else if (expected[i] !== actual[i]) return null;
    }
    return params;
}

function stamp() {
    return new Date().toISOString();
}

/**
 * Résout un appel domaine comme l’API, sans réseau.
 * @returns Le corps déjà dépaqueté (même contrat que `fetchWrapper`).
 */
export function handleDemoRequest(method: string, url: string, body?: unknown): unknown {
    const result = dispatch(method.toUpperCase(), pathOf(url), body);
    if (result.status === 204) return undefined;
    return result.body;
}

function dispatch(method: string, target: { path: string; query: URLSearchParams }, body: unknown): DemoResult {
    const { path, query } = target;
    const db = demoDb();

    if (path === '/api/settings' && method === 'GET') return ok(db.settings);
    if (path === '/api/settings' && (method === 'PUT' || method === 'PATCH')) {
        db.settings = { ...db.settings, ...(body as Partial<UserSettings>) };
        return ok(db.settings);
    }

    if (path === '/api/vault' && method === 'GET') {
        return ok({
            exists: false,
            state: null,
            version: null,
            kdf: null,
            iterations: null,
            memoryKiB: null,
            parallelism: null,
            salt: null,
            dekWrappedPassword: null,
            recoverySalt: null,
            dekWrappedRecovery: null,
            hasRecovery: false,
            recoveryCreatedAt: null,
            locked: false,
            plan: 'free',
            allowedScope: 'core',
            pendingCount: 0,
            activatedAt: null
        });
    }
    if (path === '/api/vault/migrate' && method === 'GET') return ok({ items: [], remaining: 0 });

    if (path === '/api/notifications/unread-count' && method === 'GET') {
        return ok({ unreadCount: db.notifications.filter((item) => !item.isRead).length });
    }
    if (path === '/api/notifications' && method === 'GET') {
        const page = pageOf(db.notifications, query);
        return ok({ ...page, unreadCount: db.notifications.filter((item) => !item.isRead).length });
    }

    const tax = routeTax(method, path, body, query);
    if (tax) return tax;
    const wealth = routeWealth(method, path, query, body);
    if (wealth) return wealth;
    const filesResult = dispatchFiles(method, path, query, body);
    if (filesResult) return filesResult;
    const friends = dispatchFriends(method, path, query, body);
    if (friends) return friends;
    const recurring = dispatchRecurring(method, path, query, body);
    if (recurring) return recurring;
    if (path === '/api/accounts/shares/incoming' && method === 'GET') return ok({ items: [] });

    if (path === '/api/accounts' && method === 'GET') return ok({ items: db.accounts });
    if (path === '/api/accounts' && method === 'POST') return ok(createAccount(body as CreateAccountPayload));
    const accountId = match(path, '/api/accounts/:id');
    if (accountId && method === 'GET') return ok(findAccount(accountId.id));
    if (accountId && method === 'PUT') return ok(updateAccount(accountId.id, body as UpdateAccountPayload));
    if (accountId && method === 'DELETE') {
        removeAccount(accountId.id);
        return noContent();
    }
    const accountAction = match(path, '/api/accounts/:id/:action');
    if (accountAction && method === 'POST' && accountAction.action === 'primary') return ok(setPrimary(accountAction.id));
    if (accountAction && method === 'POST' && (accountAction.action === 'archive' || accountAction.action === 'restore')) {
        return ok(setActive(accountAction.id, accountAction.action === 'restore'));
    }
    if (path.includes('/balance-snapshots') && method === 'GET') return ok(emptyPage(query));
    if (path.includes('/shares') && method === 'GET') return ok({ items: [] });

    if (path === '/api/transactions' && method === 'GET') return ok(listTransactions(query));
    if (path === '/api/transactions' && method === 'POST') return ok(createTransaction(body as CreateTransactionPayload));
    const txId = match(path, '/api/transactions/:id');
    if (txId && method === 'GET') return ok(findTx(txId.id));
    if (txId && method === 'PUT') return ok(updateTransaction(txId.id, body as UpdateTransactionPayload));
    if (txId && method === 'DELETE') {
        removeTransaction(txId.id);
        return noContent();
    }
    if (path.startsWith('/api/transactions/') && path.endsWith('/files') && method === 'GET') return ok({ items: [], totalCount: 0 });

    if (path === '/api/tax-natures/suggest' && method === 'GET') return ok({ taxNature: null });
    if (path === '/api/categories' && method === 'GET') return ok(listCategories(query));
    if (path === '/api/categories' && method === 'POST') return ok(createCategory(body as CreateCategoryPayload));
    const categoryId = match(path, '/api/categories/:id');
    if (categoryId && method === 'GET') return ok(findCategory(categoryId.id));
    if (categoryId && method === 'PUT') return ok(updateCategory(categoryId.id, body as UpdateCategoryPayload));
    if (categoryId && method === 'DELETE') {
        removeCategory(categoryId.id);
        return noContent();
    }

    if (path === '/api/budgets' && method === 'GET') return ok(listBudgets(query));
    if (path === '/api/budgets' && method === 'POST') return ok(createBudget(body as CreateBudgetPayload));
    const budgetId = match(path, '/api/budgets/:id');
    if (budgetId && method === 'GET') return ok(findBudget(budgetId.id));
    if (budgetId && method === 'PUT') return ok(updateBudget(budgetId.id, body as UpdateBudgetPayload));
    if (budgetId && method === 'DELETE') {
        db.budgets = db.budgets.filter((item) => item.publicId !== budgetId.id);
        return noContent();
    }

    if (path === '/api/savings-goals' && method === 'GET') return ok(listGoals(query));
    if (path === '/api/savings-goals' && method === 'POST') return ok(createGoal(body as CreateSavingsGoalPayload));
    const goalId = match(path, '/api/savings-goals/:id');
    if (goalId && method === 'GET') return ok(findGoal(goalId.id));
    if (goalId && method === 'PUT') return ok(updateGoal(goalId.id, body as UpdateSavingsGoalPayload));
    if (goalId && method === 'DELETE') {
        db.goals = db.goals.filter((item) => item.publicId !== goalId.id);
        return noContent();
    }

    if (path === '/api/assets' && method === 'GET') return ok(listAssets(query));
    if (path === '/api/assets' && method === 'POST') return ok(createAsset(body as CreateAssetPayload));
    const assetResult = dispatchAsset(method, path, query, body);
    if (assetResult) return assetResult;

    if (path === '/api/net-worth' && method === 'GET') return ok(netWorthOverview());
    if (path === '/api/net-worth/snapshots' && method === 'GET') return ok({ items: netWorthSnapshots() });
    if (path === '/api/net-worth/snapshots' && method === 'POST') {
        const current = netWorthSnapshots().at(-1) ?? null;
        return ok(current);
    }

    const paymentAliases = match(path, '/api/payment-methods/:id/aliases');
    if (paymentAliases && method === 'GET') return ok(listAliases(paymentAliases.id));
    if (paymentAliases && method === 'POST') return ok(createAlias(paymentAliases.id, body as CreateAliasPayload));
    const paymentAlias = match(path, '/api/payment-methods/:id/aliases/:aliasId');
    if (paymentAlias && method === 'PUT') return ok(updateAlias(paymentAlias.id, paymentAlias.aliasId, body as UpdateAliasPayload));
    if (paymentAlias && method === 'DELETE') {
        removeAlias(paymentAlias.id, paymentAlias.aliasId);
        return noContent();
    }
    if (path === '/api/payment-methods' && method === 'GET') return ok(listPaymentMethods(query));
    if (path === '/api/payment-methods' && method === 'POST') return ok(createPaymentMethod(body as CreatePaymentMethodPayload));
    const paymentId = match(path, '/api/payment-methods/:id');
    if (paymentId && method === 'GET') return ok(findPaymentMethod(paymentId.id));
    if (paymentId && method === 'PUT') return ok(updatePaymentMethod(paymentId.id, body as UpdatePaymentMethodPayload));
    if (paymentId && method === 'DELETE') {
        removePaymentMethod(paymentId.id);
        return noContent();
    }

    if (path === '/api/tags' && method === 'GET') return ok({ items: db.tags, totalCount: db.tags.length });
    const tagId = match(path, '/api/tags/:id');
    if (tagId && method === 'GET') {
        const item = db.tags.find((row) => row.publicId === tagId.id);
        if (!item) notFound();
        return ok(item);
    }

    const tierAliases = match(path, '/api/tiers/:id/aliases');
    if (tierAliases && method === 'GET') return ok(listAliases(tierAliases.id));
    if (tierAliases && method === 'POST') return ok(createAlias(tierAliases.id, body as CreateAliasPayload));
    const tierAlias = match(path, '/api/tiers/:id/aliases/:aliasId');
    if (tierAlias && method === 'PUT') return ok(updateAlias(tierAlias.id, tierAlias.aliasId, body as UpdateAliasPayload));
    if (tierAlias && method === 'DELETE') {
        removeAlias(tierAlias.id, tierAlias.aliasId);
        return noContent();
    }
    if (path === '/api/tiers' && method === 'GET') return ok(listTiers(query));
    if (path === '/api/tiers' && method === 'POST') return ok(createTier(body as CreateTierPayload));
    const tierId = match(path, '/api/tiers/:id');
    if (tierId && method === 'GET') return ok(findTier(tierId.id));
    if (tierId && method === 'PUT') return ok(updateTier(tierId.id, body as UpdateTierPayload));
    if (tierId && method === 'DELETE') {
        removeTier(tierId.id);
        return noContent();
    }

    if (path === '/api/banks/resolve' && method === 'GET') return ok(resolveBank(query.get('iban') ?? ''));
    if (path === '/api/banks' && method === 'GET') return ok(listBanks(query));
    const bankId = match(path, '/api/banks/:id');
    if (bankId && method === 'GET') {
        const bank = DEMO_BANKS.find((item) => item.publicId === bankId.id);
        if (!bank) notFound('Banque introuvable.');
        return ok(bank);
    }

    if (method === 'GET') {
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 2) return ok(emptyPage(query));
        notFound();
    }
    if (method === 'DELETE') return noContent();
    locked();
}

function ok(body: unknown): DemoResult {
    return { status: 200, body };
}

function noContent(): DemoResult {
    return { status: 204, body: undefined };
}

function findAccount(id: string) {
    const item = demoDb().accounts.find((row) => row.publicId === id);
    if (!item) notFound('Compte introuvable.');
    return item;
}

function createAccount(body: CreateAccountPayload) {
    const db = demoDb();
    const initial = Number(body.initialBalance) || 0;
    if (body.isPrimary) db.accounts.forEach((item) => (item.isPrimary = false));
    const created = {
        publicId: body.publicId?.trim() || createPublicId(),
        name: body.name,
        type: body.type,
        currency: currencyOr(body.currency, 'CHF'),
        initialBalance: initial,
        currentBalance: initial,
        iban: body.iban ?? null,
        accountNumber: body.accountNumber ?? null,
        color: body.color ?? null,
        institutionTierPublicId: body.institutionTierPublicId ?? null,
        institutionName: null,
        bank: null,
        isPrimary: !!body.isPrimary || db.accounts.length === 0,
        isActive: true,
        createdAt: stamp(),
        updatedAt: null,
        isOwned: true,
        myRole: 'owner' as const,
        hiddenFields: []
    };
    db.accounts.push(created);
    return created;
}

function updateAccount(id: string, body: UpdateAccountPayload) {
    const account = findAccount(id);
    account.name = body.name;
    account.accountNumber = body.accountNumber;
    account.color = body.color;
    if (body.type) account.type = body.type;
    if (body.currency) account.currency = currencyOr(body.currency, account.currency);
    if (body.iban !== undefined) account.iban = body.iban;
    if (body.initialBalance != null && account.initialBalance != null && account.currentBalance != null) {
        const delta = body.initialBalance - account.initialBalance;
        account.initialBalance = body.initialBalance;
        account.currentBalance = Math.round((account.currentBalance + delta) * 100) / 100;
    }
    account.updatedAt = stamp();
    return account;
}

function removeAccount(id: string) {
    const db = demoDb();
    if (db.transactions.some((tx) => tx.movements.some((move) => move.accountPublicId === id))) {
        throw new AppError('Ce compte a des transactions.', 400);
    }
    db.accounts = db.accounts.filter((item) => item.publicId !== id);
}

function setPrimary(id: string) {
    const db = demoDb();
    const account = findAccount(id);
    db.accounts.forEach((item) => (item.isPrimary = item.publicId === account.publicId));
    return account;
}

function setActive(id: string, active: boolean) {
    const account = findAccount(id);
    if (!active && account.isPrimary) throw new AppError('Le compte principal ne peut pas être archivé.', 400);
    account.isActive = active;
    account.updatedAt = stamp();
    return account;
}

function listTransactions(query: URLSearchParams) {
    let items = demoDb()
        .transactions.slice()
        .sort((a, b) => b.operationDate.localeCompare(a.operationDate) || b.publicId.localeCompare(a.publicId));
    const account = query.get('accountPublicId');
    const category = query.get('categoryPublicId');
    const tag = query.get('tagPublicId');
    const tier = query.get('tierPublicId');
    const asset = query.get('assetPublicId');
    const from = query.get('from');
    const to = query.get('to');
    const search = query.get('search')?.trim().toLowerCase();
    if (account) items = items.filter((tx) => tx.movements.some((move) => move.accountPublicId === account));
    if (category) items = items.filter((tx) => tx.categoryPublicId === category);
    if (tag) items = items.filter((tx) => tx.tagPublicIds.includes(tag));
    if (tier) items = items.filter((tx) => tx.tierPublicId === tier);
    if (asset) items = items.filter((tx) => tx.assetPublicId === asset);
    if (from) items = items.filter((tx) => tx.operationDate >= from);
    if (to) items = items.filter((tx) => tx.operationDate <= to);
    if (search) items = items.filter((tx) => tx.label.toLowerCase().includes(search) || String(tx.amount ?? '').includes(search));
    return pageOf(items, query);
}

function createTransaction(body: CreateTransactionPayload) {
    const db = demoDb();
    if (!findAccount(body.accountPublicId)) notFound('Compte introuvable.');
    if (body.type === 'transfert' && body.counterpartyAccountPublicId) findAccount(body.counterpartyAccountPublicId);
    const tx = {
        publicId: createPublicId(),
        type: body.type,
        status: 'validee' as const,
        source: 'manuelle' as const,
        recurringExpensePublicId: body.recurringExpensePublicId ?? null,
        recurringIncomePublicId: body.recurringIncomePublicId ?? null,
        duePublicId: null,
        duePlannedAmount: null,
        label: body.label,
        amount: body.amount,
        currency: findAccount(body.accountPublicId).currency,
        operationDate: body.operationDate,
        valueDate: body.valueDate ?? body.operationDate,
        paymentMethodPublicId: body.paymentMethodPublicId ?? null,
        categoryPublicId: body.categoryPublicId ?? null,
        tierPublicId: body.tierPublicId ?? null,
        createdByUserPublicId: DEMO_USER_PUBLIC_ID,
        createdByDisplayName: 'Sacha Démo',
        createdByPhotoUrl: null,
        createdAt: stamp(),
        updatedAt: null,
        movements: buildMovements(body.type, body.accountPublicId, body.amount, body.counterpartyAccountPublicId),
        files: [],
        savingsGoalPublicId: body.savingsGoalPublicId ?? null,
        tagPublicIds: body.tagPublicIds ?? [],
        assetPublicId: body.assetPublicId ?? null
    };
    db.transactions.unshift(tx);
    applyMovement(tx, 1);
    refreshBudgets(db);
    refreshGoals(db);
    return tx;
}

function findTx(id: string) {
    const item = demoDb().transactions.find((row) => row.publicId === id);
    if (!item) notFound('Transaction introuvable.');
    return item;
}

function updateTransaction(id: string, body: UpdateTransactionPayload) {
    const db = demoDb();
    const tx = findTx(id);
    applyMovement(tx, -1);
    const accountId = tx.movements[0]?.accountPublicId ?? '';
    const counterparty = tx.type === 'transfert' ? tx.movements[1]?.accountPublicId : null;
    tx.label = body.label;
    tx.amount = body.amount;
    tx.operationDate = body.operationDate;
    tx.valueDate = body.valueDate;
    tx.paymentMethodPublicId = body.paymentMethodPublicId;
    tx.categoryPublicId = body.categoryPublicId;
    tx.tierPublicId = body.tierPublicId;
    tx.recurringExpensePublicId = body.recurringExpensePublicId;
    tx.recurringIncomePublicId = body.recurringIncomePublicId;
    tx.savingsGoalPublicId = body.savingsGoalPublicId;
    tx.assetPublicId = body.assetPublicId;
    tx.tagPublicIds = body.tagPublicIds ?? [];
    tx.movements = buildMovements(tx.type, accountId, body.amount, counterparty);
    tx.updatedAt = stamp();
    applyMovement(tx, 1);
    refreshBudgets(db);
    refreshGoals(db);
    return tx;
}

function removeTransaction(id: string) {
    const db = demoDb();
    const tx = findTx(id);
    applyMovement(tx, -1);
    db.transactions = db.transactions.filter((item) => item.publicId !== id);
    refreshBudgets(db);
    refreshGoals(db);
}

function dispatchFiles(method: string, path: string, query: URLSearchParams, body: unknown): DemoResult | null {
    if (path === '/api/files/usage' && method === 'GET') return ok(demoFileUsage());
    if (path === '/api/files/changes' && method === 'GET') {
        return ok({ items: demoDb().files, deletedPublicIds: [], serverTime: new Date().toISOString() });
    }
    if (path === '/api/files' && method === 'GET') return ok(pageOf(demoDb().files, query));
    if (path === '/api/files' && method === 'POST') {
        const preferred = typeof FormData !== 'undefined' && body instanceof FormData ? body.get('publicId') : null;
        return ok(uploadDemoFile(readUploadedFile(body), typeof preferred === 'string' ? preferred : null));
    }
    const content = match(path, '/api/files/:id/content');
    if (content && method === 'GET') return ok(demoFileContent(content.id));
    if (content && method === 'DELETE') {
        const file = findDemoFile(content.id);
        delete demoDb().fileBlobs[content.id];
        file.contentLocation = 'local_only';
        file.updatedAt = new Date().toISOString();
        return ok(file);
    }
    const fileId = match(path, '/api/files/:id');
    if (fileId && method === 'GET') return ok(findDemoFile(fileId.id));
    if (fileId && method === 'PATCH') return ok(updateDemoFile(fileId.id, (body ?? {}) as UpdateFileRequest));
    if (fileId && method === 'DELETE') {
        removeDemoFile(fileId.id);
        return noContent();
    }
    if (!path.startsWith('/api/files')) return null;
    if (method === 'GET') return ok(emptyPage(query));
    locked();
}

function people(): DemoFriend[] {
    return demoDb().friendsDirectory;
}

function findPersonByFriendship(id: string): DemoFriend {
    const person = people().find((item) => item.friendshipPublicId === id);
    if (!person) notFound('Relation introuvable.');
    return person;
}

function findPersonByUser(id: string): DemoFriend {
    const person = people().find((item) => item.userPublicId === id);
    if (!person) notFound('Utilisateur introuvable.');
    return person;
}

function dispatchFriends(method: string, path: string, query: URLSearchParams, body: unknown): DemoResult | null {
    if (path === '/api/friends/requests/incoming' && method === 'GET') {
        return ok(
            pageOf(
                people()
                    .filter((item) => item.status === 'pending' && item.direction === 'incoming')
                    .map(toRequestItem),
                query
            )
        );
    }
    if (path === '/api/friends/requests/outgoing' && method === 'GET') {
        return ok(
            pageOf(
                people()
                    .filter((item) => item.status === 'pending' && item.direction === 'outgoing')
                    .map(toRequestItem),
                query
            )
        );
    }
    if (path === '/api/friends/blocked' && method === 'GET') {
        return ok(
            pageOf(
                people()
                    .filter((item) => item.status === 'blocked')
                    .map(toBlockedItem),
                query
            )
        );
    }
    if (path === '/api/friends/search' && method === 'GET') {
        const q = query.get('q') ?? '';
        const items = people()
            .filter((item) => matchesFriendSearch(item, q))
            .map(toSearchItem);
        return ok(pageOf(items, query));
    }
    if (path === '/api/friends/requests' && method === 'POST') return ok(sendFriendRequest(body));
    const requestAction = match(path, '/api/friends/requests/:id/:action');
    if (requestAction && method === 'POST') return ok(actOnRequest(requestAction.id, requestAction.action));
    const block = match(path, '/api/friends/:id/block');
    if (block && method === 'POST') {
        blockPerson(block.id);
        return noContent();
    }
    if (block && method === 'DELETE') {
        unblockPerson(block.id);
        return noContent();
    }
    if (path === '/api/friends' && method === 'GET') {
        return ok(
            pageOf(
                people()
                    .filter((item) => item.status === 'accepted')
                    .map(toFriendItem),
                query
            )
        );
    }
    const friendId = match(path, '/api/friends/:id');
    if (friendId && method === 'PATCH') return ok(renameFriend(friendId.id, body));
    if (friendId && method === 'DELETE') {
        removeFriend(friendId.id);
        return noContent();
    }
    if (!path.startsWith('/api/friends')) return null;
    if (method === 'GET') return ok(emptyPage(query));
    locked();
}

function sendFriendRequest(body: unknown) {
    const recipientPublicId = body && typeof body === 'object' && 'recipientPublicId' in body ? String(body.recipientPublicId) : '';
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : null;
    const person = findPersonByUser(recipientPublicId);
    if (person.status === 'accepted' || person.status === 'blocked') {
        throw new AppError('Demande impossible.', 400);
    }
    person.status = 'pending';
    person.direction = 'outgoing';
    person.friendshipPublicId = person.friendshipPublicId ?? createPublicId();
    person.message = message;
    person.requestedAt = new Date().toISOString();
    person.respondedAt = null;
    return toRequestItem(person);
}

function actOnRequest(friendshipPublicId: string, action: string) {
    const person = findPersonByFriendship(friendshipPublicId);
    if (action === 'accept') {
        person.status = 'accepted';
        person.direction = null;
        person.friendsSince = new Date().toISOString();
        person.respondedAt = person.friendsSince;
        return undefined;
    }
    if (action === 'refuse' || action === 'cancel') {
        person.status = null;
        person.direction = null;
        person.message = null;
        person.friendshipPublicId = null;
        person.respondedAt = new Date().toISOString();
        return undefined;
    }
    locked();
}

function renameFriend(friendshipPublicId: string, body: unknown) {
    const person = findPersonByFriendship(friendshipPublicId);
    const nickname = body && typeof body === 'object' && 'nickname' in body ? body.nickname : null;
    person.nickname = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : null;
    return toFriendItem(person);
}

function removeFriend(friendshipPublicId: string) {
    const person = findPersonByFriendship(friendshipPublicId);
    person.status = null;
    person.direction = null;
    person.nickname = null;
    person.friendsSince = null;
    person.friendshipPublicId = null;
}

function blockPerson(userPublicId: string) {
    const person = findPersonByUser(userPublicId);
    person.status = 'blocked';
    person.direction = null;
    person.blockedAt = new Date().toISOString();
    person.friendshipPublicId = person.friendshipPublicId ?? createPublicId();
}

function unblockPerson(userPublicId: string) {
    const person = findPersonByUser(userPublicId);
    if (person.status !== 'blocked') notFound('Utilisateur introuvable.');
    person.status = null;
    person.blockedAt = null;
    person.friendshipPublicId = null;
}

function dispatchRecurring(method: string, path: string, query: URLSearchParams, body: unknown): DemoResult | null {
    if (path === '/api/recurring-suggestions' && method === 'GET') return ok({ items: [], totalCount: 0 });
    if (path === '/api/recurring-suggestions/scan' && method === 'POST') return ok({ items: [], totalCount: 0 });
    if (path.startsWith('/api/recurring-') && path.includes('/files')) {
        if (method === 'GET') return ok({ items: [], totalCount: 0 });
        if (method === 'DELETE') return noContent();
        throw new AppError('Les fichiers ne sont pas dans la démo.', 403);
    }

    const expenseDueAction = match(path, '/api/recurring-expenses/:id/dues/:dueId/:action');
    if (expenseDueAction && method === 'POST')
        return ok(settleDue('expense', expenseDueAction.id, expenseDueAction.dueId, expenseDueAction.action, body));
    const expenseDues = match(path, '/api/recurring-expenses/:id/dues');
    if (expenseDues && method === 'GET') return ok(listDues('expense', expenseDues.id, query));
    if (path === '/api/recurring-expenses' && method === 'GET') return ok(listExpenses(query));
    if (path === '/api/recurring-expenses' && method === 'POST') return ok(createExpense(body as CreateRecurringExpensePayload));
    const expenseId = match(path, '/api/recurring-expenses/:id');
    if (expenseId && method === 'GET') return ok(findExpense(expenseId.id));
    if (expenseId && method === 'PUT') return ok(updateExpense(expenseId.id, body as CreateRecurringExpensePayload));
    if (expenseId && method === 'DELETE') {
        removeExpense(expenseId.id);
        return noContent();
    }

    const incomeDueAction = match(path, '/api/recurring-incomes/:id/dues/:dueId/:action');
    if (incomeDueAction && method === 'POST')
        return ok(settleDue('income', incomeDueAction.id, incomeDueAction.dueId, incomeDueAction.action, body));
    const incomeDues = match(path, '/api/recurring-incomes/:id/dues');
    if (incomeDues && method === 'GET') return ok(listDues('income', incomeDues.id, query));
    if (path === '/api/recurring-incomes' && method === 'GET') return ok(listIncomes(query));
    if (path === '/api/recurring-incomes' && method === 'POST') return ok(createIncome(body as CreateRecurringIncomePayload));
    const incomeId = match(path, '/api/recurring-incomes/:id');
    if (incomeId && method === 'GET') return ok(findIncome(incomeId.id));
    if (incomeId && method === 'PUT') return ok(updateIncome(incomeId.id, body as CreateRecurringIncomePayload));
    if (incomeId && method === 'DELETE') {
        removeIncome(incomeId.id);
        return noContent();
    }

    if (!path.startsWith('/api/recurring-')) return null;
    if (method === 'GET') return ok(emptyPage(query));
    if (method === 'DELETE') return noContent();
    locked();
}

function duesInRange(dues: RecurringDue[], query: URLSearchParams) {
    const from = query.get('from');
    const to = query.get('to');
    const status = query.get('status');
    return dues.filter((due) => {
        if (from && due.scheduledAt < from) return false;
        if (to && due.scheduledAt > to) return false;
        if (status && due.status !== status) return false;
        return true;
    });
}

function listExpenses(query: URLSearchParams) {
    const db = demoDb();
    const active = query.get('isActive');
    const account = query.get('accountPublicId');
    const items = db.recurringExpenses.filter((item) => {
        if (active === 'true' && !item.isActive) return false;
        if (active === 'false' && item.isActive) return false;
        if (account && item.accountPublicId !== account) return false;
        const dues = db.expenseDues[item.publicId] ?? [];
        if ((query.get('from') || query.get('to')) && !duesInRange(dues, query).length) return false;
        return true;
    });
    return pageOf(items, query);
}

function findExpense(id: string) {
    const item = demoDb().recurringExpenses.find((row) => row.publicId === id);
    if (!item) notFound('Charge récurrente introuvable.');
    refreshExpenseUpcoming(item, demoDb().expenseDues[id] ?? []);
    return item;
}

function createExpense(body: CreateRecurringExpensePayload) {
    const db = demoDb();
    const created = expenseFromPayload(createPublicId(), body);
    const dues = duesFromExpense(created);
    db.expenseDues[created.publicId] = dues;
    refreshExpenseUpcoming(created, dues);
    db.recurringExpenses.unshift(created);
    return created;
}

function updateExpense(id: string, body: CreateRecurringExpensePayload) {
    const current = findExpense(id);
    const next = expenseFromPayload(id, body);
    next.createdAt = current.createdAt;
    next.updatedAt = stamp();
    const dues = duesFromExpense(next);
    demoDb().expenseDues[id] = dues;
    refreshExpenseUpcoming(next, dues);
    const index = demoDb().recurringExpenses.findIndex((item) => item.publicId === id);
    demoDb().recurringExpenses[index] = next;
    return next;
}

function removeExpense(id: string) {
    findExpense(id);
    const db = demoDb();
    db.recurringExpenses = db.recurringExpenses.filter((item) => item.publicId !== id);
    delete db.expenseDues[id];
}

function listIncomes(query: URLSearchParams) {
    const db = demoDb();
    const active = query.get('isActive');
    const account = query.get('accountPublicId');
    const items = db.recurringIncomes.filter((item) => {
        if (active === 'true' && !item.isActive) return false;
        if (active === 'false' && item.isActive) return false;
        if (account && item.accountPublicId !== account) return false;
        const dues = db.incomeDues[item.publicId] ?? [];
        if ((query.get('from') || query.get('to')) && !duesInRange(dues, query).length) return false;
        return true;
    });
    return pageOf(items, query);
}

function findIncome(id: string) {
    const item = demoDb().recurringIncomes.find((row) => row.publicId === id);
    if (!item) notFound('Revenu récurrent introuvable.');
    refreshIncomeUpcoming(item, demoDb().incomeDues[id] ?? []);
    return item;
}

function createIncome(body: CreateRecurringIncomePayload) {
    const db = demoDb();
    const created = incomeFromPayload(createPublicId(), body);
    const dues = duesFromIncome(created);
    db.incomeDues[created.publicId] = dues;
    refreshIncomeUpcoming(created, dues);
    db.recurringIncomes.unshift(created);
    return created;
}

function updateIncome(id: string, body: CreateRecurringIncomePayload) {
    const current = findIncome(id);
    const next = incomeFromPayload(id, body);
    next.createdAt = current.createdAt;
    next.updatedAt = stamp();
    const dues = duesFromIncome(next);
    demoDb().incomeDues[id] = dues;
    refreshIncomeUpcoming(next, dues);
    const index = demoDb().recurringIncomes.findIndex((item) => item.publicId === id);
    demoDb().recurringIncomes[index] = next;
    return next;
}

function removeIncome(id: string) {
    findIncome(id);
    const db = demoDb();
    db.recurringIncomes = db.recurringIncomes.filter((item) => item.publicId !== id);
    delete db.incomeDues[id];
}

function listDues(kind: 'expense' | 'income', id: string, query: URLSearchParams) {
    if (kind === 'expense') findExpense(id);
    else findIncome(id);
    const dues = kind === 'expense' ? (demoDb().expenseDues[id] ?? []) : (demoDb().incomeDues[id] ?? []);
    return pageOf(duesInRange(dues, query), query);
}

function settleDue(kind: 'expense' | 'income', id: string, dueId: string, action: string, body: unknown) {
    const dues = kind === 'expense' ? demoDb().expenseDues[id] : demoDb().incomeDues[id];
    const due = dues?.find((item) => item.publicId === dueId);
    if (!due) notFound('Échéance introuvable.');
    if (action === 'skip') {
        due.status = kind === 'expense' ? 'canceled' : 'annule';
    } else if (action === 'confirm') {
        const amount =
            body && typeof body === 'object' && 'amount' in body && typeof body.amount === 'number' ? body.amount : due.plannedAmount;
        due.status = kind === 'expense' ? 'payee' : 'encaisse';
        due.actualAmount = amount;
    } else {
        locked();
    }
    if (kind === 'expense') refreshExpenseUpcoming(findExpense(id), dues ?? []);
    else refreshIncomeUpcoming(findIncome(id), dues ?? []);
    return due;
}

function listTiers(query: URLSearchParams) {
    const db = demoDb();
    const isBank = query.get('isBank');
    const nature = query.get('nature');
    const role = query.get('role');
    const search = query.get('search')?.trim().toLowerCase();
    let items = db.tiers.slice();
    if (isBank === 'true') items = items.filter((item) => item.roles.includes('banque'));
    if (isBank === 'false') items = items.filter((item) => !item.roles.includes('banque'));
    if (nature) items = items.filter((item) => item.nature === nature);
    if (role) items = items.filter((item) => item.roles.includes(role as (typeof item.roles)[number]));
    if (search) items = items.filter((item) => item.name.toLowerCase().includes(search));
    return pageOf(items, query);
}

function findTier(id: string) {
    const item = demoDb().tiers.find((row) => row.publicId === id);
    if (!item) notFound('Tiers introuvable.');
    return item;
}

function bankFromPayload(bank: TierBankPayload | null) {
    if (!bank) return null;
    if ('bankPublicId' in bank) {
        const found = DEMO_BANKS.find((item) => item.publicId === bank.bankPublicId);
        return {
            bankPublicId: bank.bankPublicId,
            bankName: found?.name ?? null,
            bic: found?.bic ?? null,
            iid: found?.iid ?? null,
            countryCode: found?.countryCode ?? null
        };
    }
    return { bankPublicId: null, bankName: null, bic: bank.bic, iid: bank.iid, countryCode: 'CH' as const };
}

function createTier(body: CreateTierPayload) {
    const created = {
        publicId: body.publicId?.trim() || createPublicId(),
        name: body.name,
        nature: body.nature,
        email: body.email,
        phone: body.phone,
        website: body.website,
        notes: body.notes,
        roles: body.roles ?? [],
        person: body.person,
        company: body.company,
        organization: body.organization,
        bank: bankFromPayload(body.bank),
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().tiers.unshift(created);
    return created;
}

function updateTier(id: string, body: UpdateTierPayload) {
    const item = findTier(id);
    item.name = body.name;
    item.nature = body.nature;
    item.email = body.email;
    item.phone = body.phone;
    item.website = body.website;
    item.notes = body.notes;
    item.roles = body.roles ?? [];
    item.person = body.person;
    item.company = body.company;
    item.organization = body.organization;
    item.bank = bankFromPayload(body.bank);
    item.updatedAt = stamp();
    return item;
}

function removeTier(id: string) {
    const db = demoDb();
    findTier(id);
    const used =
        db.transactions.some((tx) => tx.tierPublicId === id) || db.accounts.some((account) => account.institutionTierPublicId === id);
    if (used) throw new AppError('Ce tiers est utilisé par un compte ou une transaction.', 400);
    db.tiers = db.tiers.filter((item) => item.publicId !== id);
    delete db.aliases[id];
}

function listPaymentMethods(query: URLSearchParams) {
    const accountPublicId = query.get('accountPublicId');
    const items = demoDb().paymentMethods.filter((item) => !accountPublicId || item.accountPublicId === accountPublicId);
    return pageOf(items, query);
}

function findPaymentMethod(id: string) {
    const item = demoDb().paymentMethods.find((row) => row.publicId === id);
    if (!item) notFound('Moyen de paiement introuvable.');
    return item;
}

function createPaymentMethod(body: CreatePaymentMethodPayload) {
    findAccount(body.accountPublicId);
    const created = {
        publicId: createPublicId(),
        accountPublicId: body.accountPublicId,
        type: body.type,
        label: body.label,
        reference: body.reference ?? null,
        lastFourDigits: body.lastFourDigits ?? null,
        expirationDate: body.expirationDate ?? null,
        isActive: body.isActive ?? true,
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().paymentMethods.push(created);
    return created;
}

function updatePaymentMethod(id: string, body: UpdatePaymentMethodPayload) {
    const item = findPaymentMethod(id);
    item.type = body.type;
    item.label = body.label;
    item.reference = body.reference;
    item.lastFourDigits = body.lastFourDigits;
    item.expirationDate = body.expirationDate;
    item.isActive = body.isActive;
    item.updatedAt = stamp();
    return item;
}

function removePaymentMethod(id: string) {
    const db = demoDb();
    findPaymentMethod(id);
    if (db.transactions.some((tx) => tx.paymentMethodPublicId === id)) {
        throw new AppError('Ce moyen de paiement est utilisé par une transaction.', 400);
    }
    db.paymentMethods = db.paymentMethods.filter((item) => item.publicId !== id);
    delete db.aliases[id];
}

function aliasesOf(ownerId: string) {
    const db = demoDb();
    db.aliases[ownerId] ??= [];
    return db.aliases[ownerId];
}

function listAliases(ownerId: string) {
    const items = aliasesOf(ownerId);
    return { items, totalCount: items.length };
}

function createAlias(ownerId: string, body: CreateAliasPayload) {
    const created = {
        publicId: createPublicId(),
        value: body.value,
        matchType: body.matchType ?? 'contains',
        priority: body.priority ?? 0,
        isActive: body.isActive ?? true,
        createdByImport: false,
        createdAt: stamp(),
        updatedAt: null
    };
    aliasesOf(ownerId).push(created);
    return created;
}

function updateAlias(ownerId: string, aliasId: string, body: UpdateAliasPayload) {
    const item = aliasesOf(ownerId).find((row) => row.publicId === aliasId);
    if (!item) notFound('Alias introuvable.');
    item.value = body.value;
    item.matchType = body.matchType;
    item.priority = body.priority;
    item.isActive = body.isActive;
    item.updatedAt = stamp();
    return item;
}

function removeAlias(ownerId: string, aliasId: string) {
    const items = aliasesOf(ownerId);
    const next = items.filter((item) => item.publicId !== aliasId);
    if (next.length === items.length) notFound('Alias introuvable.');
    demoDb().aliases[ownerId] = next;
}

function listBanks(query: URLSearchParams) {
    const q = query.get('q')?.trim().toLowerCase();
    const country = query.get('country')?.trim().toUpperCase();
    const items = DEMO_BANKS.filter((bank) => {
        if (country && bank.countryCode !== country) return false;
        if (!q) return true;
        return bank.name.toLowerCase().includes(q) || (bank.bic ?? '').toLowerCase().includes(q) || bank.iid.includes(q);
    });
    return pageOf(items, query);
}

function resolveBank(ibanRaw: string) {
    const iban = ibanRaw.replace(/\s+/g, '').toUpperCase();
    if (!/^(CH|LI)/.test(iban) || iban.length !== 21) throw new AppError('IBAN invalide ou étranger.', 400);
    const iid = iban.slice(4, 9);
    const bank = DEMO_BANKS.find((item) => item.iid === iid);
    if (!bank) notFound('Banque introuvable pour cet IBAN.');
    return { iban, iid, iidType: 'headquarters' as const, branchTown: bank.town, bank };
}

function listCategories(query: URLSearchParams) {
    const type = query.get('type');
    const items = demoDb()
        .categories.filter((item) => !type || item.type === type)
        .map((item) => ({
            ...item,
            children: (item.children ?? []).filter((child) => !type || child.type === type)
        }));
    const totalCount = items.reduce((count, item) => count + 1 + item.children.length, 0);
    return { items, totalCount };
}

function findCategory(id: string) {
    for (const root of demoDb().categories) {
        if (root.publicId === id) return root;
        const child = root.children.find((item) => item.publicId === id);
        if (child) return child;
    }
    notFound('Catégorie introuvable.');
}

function attachCategory(item: ReturnType<typeof findCategory>) {
    const db = demoDb();
    if (item.parentPublicId) {
        const parent = db.categories.find((row) => row.publicId === item.parentPublicId);
        if (!parent) notFound('Catégorie parente introuvable.');
        item.children = [];
        parent.children.push(item);
        return;
    }
    item.parentPublicId = null;
    db.categories.push(item);
}

function detachCategory(id: string) {
    const db = demoDb();
    const rootIndex = db.categories.findIndex((item) => item.publicId === id);
    if (rootIndex >= 0) {
        db.categories.splice(rootIndex, 1);
        return;
    }
    for (const root of db.categories) {
        const index = root.children.findIndex((item) => item.publicId === id);
        if (index >= 0) {
            root.children.splice(index, 1);
            return;
        }
    }
}

function createCategory(body: CreateCategoryPayload) {
    const created = {
        publicId: createPublicId(),
        name: body.name,
        type: body.type,
        color: body.color ?? null,
        icone: body.icone ?? null,
        parentPublicId: body.parentPublicId?.trim() || null,
        taxNature: body.taxNature?.trim() || null,
        createdAt: stamp(),
        updatedAt: null,
        children: [] as ReturnType<typeof findCategory>['children']
    };
    attachCategory(created);
    return created;
}

function updateCategory(id: string, body: UpdateCategoryPayload) {
    const item = findCategory(id);
    const nextParent = body.parentPublicId?.trim() || null;
    if ((item.parentPublicId ?? null) !== nextParent) {
        if (item.children.length && nextParent) {
            throw new AppError('Une catégorie avec des sous-catégories reste à la racine.', 400);
        }
        detachCategory(id);
        item.parentPublicId = nextParent;
        attachCategory(item);
    }
    item.name = body.name;
    item.type = body.type;
    item.color = body.color;
    item.icone = body.icone;
    // Absent : la nature est conservée ; chaîne vide : elle est effacée (comme l'API).
    if (body.taxNature !== undefined) item.taxNature = body.taxNature.trim() || null;
    item.updatedAt = stamp();
    return item;
}

function removeCategory(id: string) {
    const item = findCategory(id);
    if (item.children.length) throw new AppError('Cette catégorie a des sous-catégories.', 400);
    detachCategory(id);
}

function listBudgets(query: URLSearchParams) {
    refreshBudgets(demoDb());
    let items = demoDb().budgets.slice();
    const active = query.get('isActive');
    if (active === 'true') items = items.filter((item) => item.isActive);
    if (active === 'false') items = items.filter((item) => !item.isActive);
    const category = query.get('categoryPublicId');
    if (category) items = items.filter((item) => item.categoryPublicId === category);
    const periode = query.get('periode');
    if (periode) items = items.filter((item) => item.periode === periode);
    return { items, totalCount: items.length };
}

function findBudget(id: string) {
    refreshBudgets(demoDb());
    const item = demoDb().budgets.find((row) => row.publicId === id);
    if (!item) notFound('Budget introuvable.');
    return item;
}

function createBudget(body: CreateBudgetPayload) {
    const bounds = periodBounds(body.periode, body.startDate);
    const created = {
        publicId: createPublicId(),
        name: body.name,
        limitAmount: body.limitAmount,
        currency: currencyOr(body.currency, 'CHF'),
        periode: body.periode,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        isActive: body.isActive ?? true,
        categoryPublicId: body.categoryPublicId ?? null,
        ...bounds,
        spentAmount: 0,
        remainingAmount: body.limitAmount,
        percentUsed: 0,
        isCurrent: true,
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().budgets.push(created);
    refreshBudgets(demoDb());
    return created;
}

function updateBudget(id: string, body: UpdateBudgetPayload) {
    const item = findBudget(id);
    const bounds = periodBounds(body.periode, body.startDate);
    item.name = body.name;
    item.limitAmount = body.limitAmount;
    item.periode = body.periode;
    item.startDate = body.startDate;
    item.endDate = body.endDate;
    item.isActive = body.isActive;
    item.categoryPublicId = body.categoryPublicId;
    item.currency = body.currency;
    item.periodStart = bounds.periodStart;
    item.periodEnd = bounds.periodEnd;
    item.updatedAt = stamp();
    refreshBudgets(demoDb());
    return item;
}

function listGoals(query: URLSearchParams) {
    refreshGoals(demoDb());
    let items = demoDb().goals.slice();
    const status = query.get('status');
    if (status) items = items.filter((item) => item.status === status);
    const account = query.get('accountPublicId');
    if (account) items = items.filter((item) => item.accountPublicId === account);
    return { items: items.map((item) => ({ ...item, contributions: [] })), totalCount: items.length };
}

function findGoal(id: string) {
    refreshGoals(demoDb());
    const item = demoDb().goals.find((row) => row.publicId === id);
    if (!item) notFound('Objectif introuvable.');
    return item;
}

function createGoal(body: CreateSavingsGoalPayload) {
    const opening = body.openingAmount ?? 0;
    const created = {
        publicId: createPublicId(),
        name: body.name,
        targetAmount: body.targetAmount,
        openingAmount: opening,
        contributedAmount: 0,
        currentAmount: opening,
        remainingAmount: Math.max(0, body.targetAmount - opening),
        percentReached: body.targetAmount > 0 ? (opening / body.targetAmount) * 100 : 0,
        currency: currencyOr(body.currency, 'CHF'),
        targetDate: body.targetDate ?? null,
        projectedDate: null,
        status: 'active' as const,
        isOverdue: false,
        accountPublicId: body.accountPublicId ?? null,
        contributions: [],
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().goals.push(created);
    refreshGoals(demoDb());
    return created;
}

function updateGoal(id: string, body: UpdateSavingsGoalPayload) {
    const item = findGoal(id);
    item.name = body.name;
    item.targetAmount = body.targetAmount;
    item.openingAmount = body.openingAmount;
    item.targetDate = body.targetDate;
    item.accountPublicId = body.accountPublicId;
    item.currency = body.currency;
    if (body.status) item.status = body.status;
    item.updatedAt = stamp();
    refreshGoals(demoDb());
    return item;
}

function dispatchAsset(method: string, path: string, query: URLSearchParams, body: unknown): DemoResult | null {
    const valuations = match(path, '/api/assets/:id/valuations');
    if (valuations && method === 'GET') return ok(listValuations(valuations.id, query));
    if (valuations && method === 'POST') return ok(saveValuation(valuations.id, body as SaveAssetValuationPayload));
    const valuation = match(path, '/api/assets/:id/valuations/:date');
    if (valuation && method === 'DELETE') {
        removeValuation(valuation.id, valuation.date);
        return noContent();
    }

    const mileages = match(path, '/api/assets/:id/vehicle/mileages');
    if (mileages && method === 'GET') return ok(listMileages(mileages.id));
    if (mileages && method === 'POST') return ok(saveMileage(mileages.id, body as SaveVehicleMileagePayload));
    const mileage = match(path, '/api/assets/:id/vehicle/mileages/:date');
    if (mileage && method === 'DELETE') {
        removeMileage(mileage.id, mileage.date);
        return noContent();
    }

    const maintenances = match(path, '/api/assets/:id/vehicle/maintenances');
    if (maintenances && method === 'GET') return ok(listMaintenances(maintenances.id));
    if (maintenances && method === 'POST') return ok(createMaintenance(maintenances.id, body as SaveVehicleMaintenancePayload));
    const maintenance = match(path, '/api/assets/:id/vehicle/maintenances/:maintenanceId');
    if (maintenance && method === 'PUT') {
        return ok(updateMaintenance(maintenance.id, maintenance.maintenanceId, body as SaveVehicleMaintenancePayload));
    }
    if (maintenance && method === 'DELETE') {
        removeMaintenance(maintenance.id, maintenance.maintenanceId);
        return noContent();
    }

    if (path.includes('/files')) {
        if (method === 'GET') return ok({ items: [], totalCount: 0 });
        if (method === 'DELETE') return noContent();
        throw new AppError('Les fichiers ne sont pas dans la démo.', 403);
    }

    const assetId = match(path, '/api/assets/:id');
    if (!assetId) return null;
    if (method === 'GET') return ok(findAsset(assetId.id));
    if (method === 'PUT') return ok(updateAsset(assetId.id, body as UpdateAssetPayload));
    if (method === 'DELETE') {
        removeAsset(assetId.id);
        return noContent();
    }
    return null;
}

function blankAssetDetails(): Pick<Asset, 'vehicle' | 'crypto' | 'valuableItem' | 'savingsAccount' | 'other' | 'realEstate'> {
    return { vehicle: null, crypto: null, valuableItem: null, savingsAccount: null, other: null, realEstate: null };
}

function applyAssetDetails(asset: Asset, body: CreateAssetPayload | UpdateAssetPayload) {
    Object.assign(asset, blankAssetDetails());
    if (body.vehicle) asset.vehicle = { ...body.vehicle };
    if (body.crypto) asset.crypto = { ...body.crypto, symbol: body.crypto.symbol.toUpperCase() };
    if (body.valuableItem) asset.valuableItem = { ...body.valuableItem };
    if (body.savingsAccount) asset.savingsAccount = { ...body.savingsAccount };
    if (body.other) asset.other = { ...body.other };
    if (body.realEstate) {
        asset.realEstate = {
            details: { ...body.realEstate, country: body.realEstate.country?.toUpperCase() ?? null },
            summary: null
        };
    }
}

function syncSavingsValue(asset: Asset) {
    const accountId = asset.savingsAccount?.accountPublicId;
    if (asset.type !== 'compteEpargne' || !accountId) {
        asset.isValueFromAccount = false;
        return;
    }
    const account = demoDb().accounts.find((item) => item.publicId === accountId);
    if (account?.currentBalance == null) return;
    asset.estimatedValue = account.currentBalance;
    asset.currency = account.currency;
    asset.isValueFromAccount = true;
}

function createAsset(body: CreateAssetPayload) {
    const db = demoDb();
    const asset: Asset = {
        publicId: body.publicId?.trim() || createPublicId(),
        name: body.name,
        type: body.type,
        estimatedValue: body.estimatedValue,
        currency: currencyOr(body.currency, 'CHF'),
        acquisitionDate: body.acquisitionDate ?? null,
        acquisitionPrice: body.acquisitionPrice ?? null,
        description: body.description ?? null,
        notes: body.notes ?? null,
        isActive: true,
        lastValuationDate: null,
        isValueFromAccount: false,
        ...blankAssetDetails(),
        createdAt: stamp(),
        updatedAt: null
    };
    applyAssetDetails(asset, body);
    syncSavingsValue(asset);
    db.assets.push(asset);
    db.assetValuations[asset.publicId] = [];
    db.assetMileages[asset.publicId] = [];
    db.assetMaintenances[asset.publicId] = [];
    return findAsset(asset.publicId);
}

function updateAsset(id: string, body: UpdateAssetPayload) {
    const asset = findAsset(id);
    asset.name = body.name;
    asset.estimatedValue = body.estimatedValue;
    asset.currency = body.currency;
    asset.acquisitionDate = body.acquisitionDate;
    asset.acquisitionPrice = body.acquisitionPrice;
    asset.description = body.description;
    asset.notes = body.notes;
    asset.isActive = body.isActive;
    applyAssetDetails(asset, body);
    syncSavingsValue(asset);
    asset.updatedAt = stamp();
    return findAsset(id);
}

function removeAsset(id: string) {
    const db = demoDb();
    if (!db.assets.some((item) => item.publicId === id)) notFound('Actif introuvable.');
    db.assets = db.assets.filter((item) => item.publicId !== id);
    delete db.assetValuations[id];
    delete db.assetMileages[id];
    delete db.assetMaintenances[id];
}

function valuationsOf(id: string) {
    findAsset(id);
    const db = demoDb();
    db.assetValuations[id] ??= [];
    return db.assetValuations[id];
}

function listValuations(id: string, query: URLSearchParams) {
    const from = query.get('from');
    const to = query.get('to');
    const items = valuationsOf(id)
        .filter((item) => (!from || item.valuationDate >= from) && (!to || item.valuationDate <= to))
        .slice()
        .sort((a, b) => b.valuationDate.localeCompare(a.valuationDate));
    return { items, totalCount: items.length };
}

function saveValuation(id: string, body: SaveAssetValuationPayload) {
    const items = valuationsOf(id);
    const existing = items.find((item) => item.valuationDate === body.valuationDate);
    const saved = existing ?? {
        valuationDate: body.valuationDate,
        value: body.value,
        source: 'manuelle' as const,
        createdAt: stamp(),
        updatedAt: null
    };
    saved.value = body.value;
    saved.updatedAt = existing ? stamp() : null;
    if (!existing) items.push(saved);
    const latest = items.slice().sort((a, b) => b.valuationDate.localeCompare(a.valuationDate))[0];
    const asset = findAsset(id);
    if (latest && !asset.isValueFromAccount) {
        asset.estimatedValue = latest.value;
        asset.lastValuationDate = latest.valuationDate;
    }
    return saved;
}

function removeValuation(id: string, date: string) {
    const items = valuationsOf(id);
    const next = items.filter((item) => item.valuationDate !== date);
    if (next.length === items.length) notFound('Valorisation introuvable.');
    demoDb().assetValuations[id] = next;
    const asset = findAsset(id);
    const latest = next.slice().sort((a, b) => b.valuationDate.localeCompare(a.valuationDate))[0];
    if (!asset.isValueFromAccount) {
        asset.lastValuationDate = latest?.valuationDate ?? null;
        if (latest) asset.estimatedValue = latest.value;
    }
}

function mileagesOf(id: string) {
    const asset = findAsset(id);
    if (asset.type !== 'vehicule') throw new AppError('Cet actif n’est pas un véhicule.', 400);
    const db = demoDb();
    db.assetMileages[id] ??= [];
    return db.assetMileages[id];
}

function listMileages(id: string) {
    const items = mileagesOf(id)
        .slice()
        .sort((a, b) => b.statementDate.localeCompare(a.statementDate));
    return { items, totalCount: items.length };
}

function saveMileage(id: string, body: SaveVehicleMileagePayload) {
    const items = mileagesOf(id);
    const existing = items.find((item) => item.statementDate === body.statementDate);
    const saved = existing ?? {
        statementDate: body.statementDate,
        kilometrage: body.kilometrage,
        source: 'manuelle' as const,
        createdAt: stamp()
    };
    saved.kilometrage = body.kilometrage;
    if (!existing) items.push(saved);
    const latest = items.slice().sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
    const asset = findAsset(id);
    if (asset.vehicle && latest) asset.vehicle.currentMileage = latest.kilometrage;
    return saved;
}

function removeMileage(id: string, date: string) {
    const items = mileagesOf(id);
    const next = items.filter((item) => item.statementDate !== date);
    if (next.length === items.length) notFound('Relevé introuvable.');
    demoDb().assetMileages[id] = next;
    const asset = findAsset(id);
    const latest = next.slice().sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
    if (asset.vehicle) asset.vehicle.currentMileage = latest?.kilometrage ?? null;
}

function maintenancesOf(id: string) {
    const asset = findAsset(id);
    if (asset.type !== 'vehicule') throw new AppError('Cet actif n’est pas un véhicule.', 400);
    const db = demoDb();
    db.assetMaintenances[id] ??= [];
    return db.assetMaintenances[id];
}

function listMaintenances(id: string) {
    const items = maintenancesOf(id)
        .slice()
        .sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate));
    return { items, totalCount: items.length };
}

function maintenanceFrom(id: string, body: SaveVehicleMaintenancePayload, publicId: string) {
    const asset = findAsset(id);
    const garage = body.garageTierPublicId ? demoDb().tiers.find((item) => item.publicId === body.garageTierPublicId) : null;
    return {
        publicId,
        maintenanceDate: body.maintenanceDate,
        maintenanceType: body.maintenanceType,
        kilometrage: body.kilometrage,
        garageTierPublicId: body.garageTierPublicId,
        garageTierName: garage?.name ?? null,
        cost: body.cost,
        currency: asset.currency,
        transactionPublicId: body.transactionPublicId,
        description: body.description,
        nextMaintenanceDate: body.nextMaintenanceDate,
        nextMaintenanceKm: body.nextMaintenanceKm,
        createdAt: stamp(),
        updatedAt: null
    };
}

function createMaintenance(id: string, body: SaveVehicleMaintenancePayload) {
    const created = maintenanceFrom(id, body, createPublicId());
    maintenancesOf(id).push(created);
    return created;
}

function updateMaintenance(id: string, maintenanceId: string, body: SaveVehicleMaintenancePayload) {
    const items = maintenancesOf(id);
    const index = items.findIndex((item) => item.publicId === maintenanceId);
    if (index < 0) notFound('Entretien introuvable.');
    const createdAt = items[index].createdAt;
    const updated = { ...maintenanceFrom(id, body, maintenanceId), createdAt, updatedAt: stamp() };
    items[index] = updated;
    return updated;
}

function removeMaintenance(id: string, maintenanceId: string) {
    const items = maintenancesOf(id);
    const next = items.filter((item) => item.publicId !== maintenanceId);
    if (next.length === items.length) notFound('Entretien introuvable.');
    demoDb().assetMaintenances[id] = next;
}

function listAssets(query: URLSearchParams) {
    let items = demoDb().assets.slice();
    const type = query.get('type');
    const active = query.get('active');
    if (type) items = items.filter((item) => item.type === type);
    if (active === 'true') items = items.filter((item) => item.isActive);
    if (active === 'false') items = items.filter((item) => !item.isActive);
    return {
        items: items.map((item) => ({ ...item, realEstate: item.realEstate ? { ...item.realEstate, summary: null } : null })),
        totalCount: items.length
    };
}

function findAsset(id: string) {
    const item = demoDb().assets.find((row) => row.publicId === id);
    if (!item) notFound('Actif introuvable.');
    if (item.realEstate) {
        const mortgage = mortgageRemainingFor(item.publicId);
        item.realEstate.summary = {
            mortgageRemaining: mortgage,
            mortgageExcludedCount: 0,
            equity: item.estimatedValue - mortgage,
            isRented: false,
            monthlyRent: 0,
            monthlyRentalCharges: 0,
            monthlyCharges: 0,
            maintenanceTotal: 0,
            unitsCount: 0,
            chargesCount: 0,
            maintenanceCount: 0,
            documentsCount: 0,
            rentalsCount: 0,
            activeRentalsCount: 0
        };
    }
    return item;
}
