import type { Alias } from '@/features/aliases/types';
import type { Account, AccountType, Currency } from '@/features/accounts/types';
import type { Bank } from '@/features/banks/types';
import type { Asset, AssetValuation, VehicleMaintenance, VehicleMileage } from '@/features/assets/types';
import type { Budget } from '@/features/budgets/types';
import type { Category, CategoryType } from '@/features/categories/types';
import type { FileDto } from '@/features/files/types';
import type { AppNotification } from '@/features/notifications/types';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { RecurringDue, RecurringExpense, RecurringIncome } from '@/features/recurring-payments/types';
import type { SavingsGoal, SavingsGoalStatus } from '@/features/savings-goals/types';
import type { Instrument, InvestmentOperation } from '@/features/investments/types';
import type { Liability } from '@/features/liabilities/types';
import type { PersonalLoan } from '@/features/personal-loans/types';
import type { RealEstateCharge, RealEstateMaintenance, RealEstateUnit } from '@/features/real-estate/types';
import type { SharedDebt } from '@/features/shared-debts/types';
import { seedFriends, type DemoFriend } from '@/features/demo/friends';
import { seedRecurringHousehold } from '@/features/demo/recurring';
import { seedWealth } from '@/features/demo/wealth';
import { seedTaxReturns, type DemoTaxReturn } from '@/features/demo/tax';
import type { Tag } from '@/features/tags/types';
import type { Tier } from '@/features/tiers/types';
import type { Transaction, TransactionMovement, TransactionType } from '@/features/transactions/types';
import { USER_SETTINGS_DEFAULTS, type UserSettings } from '@/features/user-settings/types';
import type { NetWorthOverview, NetWorthSnapshot } from '@/features/net-worth/types';
import { DEMO_USER_PUBLIC_ID } from '@/features/demo/user';

const NOW = '2026-11-14T09:00:00.000Z';

/** Référentiel bancaire de la démo (lecture seule, comme le référentiel SIX). */
export const DEMO_BANKS: Bank[] = [
    {
        publicId: 'bank-00240',
        name: 'UBS Switzerland AG',
        bic: 'UBSWCHZH80A',
        iid: '00240',
        town: 'Zürich',
        countryCode: 'CH',
        isActive: true
    },
    { publicId: 'bank-09000', name: 'PostFinance AG', bic: 'POFICHBEXXX', iid: '09000', town: 'Bern', countryCode: 'CH', isActive: true },
    {
        publicId: 'bank-80808',
        name: 'Banque Raiffeisen',
        bic: 'RAIFCH22XXX',
        iid: '80808',
        town: 'St. Gallen',
        countryCode: 'CH',
        isActive: true
    },
    {
        publicId: 'bank-00788',
        name: 'Banque Cantonale Vaudoise',
        bic: 'BCVLCH2LXXX',
        iid: '00788',
        town: 'Lausanne',
        countryCode: 'CH',
        isActive: true
    }
];

export type DemoDb = {
    settings: UserSettings;
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    goals: SavingsGoal[];
    assets: Asset[];
    assetValuations: Record<string, AssetValuation[]>;
    assetMileages: Record<string, VehicleMileage[]>;
    assetMaintenances: Record<string, VehicleMaintenance[]>;
    paymentMethods: PaymentMethod[];
    tags: Tag[];
    tiers: Tier[];
    /** Alias d’import, clé = publicId du tier ou du moyen de paiement. */
    aliases: Record<string, Alias[]>;
    recurringExpenses: RecurringExpense[];
    recurringIncomes: RecurringIncome[];
    expenseDues: Record<string, RecurringDue[]>;
    incomeDues: Record<string, RecurringDue[]>;
    friendsDirectory: DemoFriend[];
    files: FileDto[];
    fileBlobs: Record<string, Blob>;
    liabilities: Liability[];
    personalLoans: PersonalLoan[];
    sharedDebts: SharedDebt[];
    instruments: Instrument[];
    operations: InvestmentOperation[];
    realEstateUnits: Record<string, RealEstateUnit[]>;
    realEstateCharges: Record<string, RealEstateCharge[]>;
    realEstateMaintenance: Record<string, RealEstateMaintenance[]>;
    notifications: AppNotification[];
    taxReturns: DemoTaxReturn[];
};

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function createPublicId(): string {
    let id = '';
    for (let i = 0; i < 7; i += 1) {
        id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return id;
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function category(
    publicId: string,
    name: string,
    type: CategoryType,
    color: string,
    extras: { parentPublicId?: string | null; icone?: string | null; taxNature?: string | null } = {}
): Category {
    return {
        publicId,
        name,
        type,
        color,
        icone: extras.icone ?? null,
        parentPublicId: extras.parentPublicId ?? null,
        createdAt: NOW,
        updatedAt: null,
        children: [],
        taxNature: extras.taxNature ?? null
    };
}

function tree(root: Category, children: Category[]): Category {
    return { ...root, children };
}

function account(
    publicId: string,
    name: string,
    type: AccountType,
    currentBalance: number,
    isPrimary: boolean,
    bank: Account['bank']
): Account {
    return {
        publicId,
        name,
        type,
        currency: 'CHF',
        initialBalance: currentBalance,
        currentBalance,
        iban: type === 'courant' ? 'CH93 0076 2011 6238 5295 7' : null,
        accountNumber: null,
        color: isPrimary ? '#5D87FF' : '#2A9D8F',
        institutionTierPublicId: bank?.tierPublicId ?? null,
        institutionName: bank?.name ?? null,
        bank,
        isPrimary,
        isActive: true,
        createdAt: NOW,
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        hiddenFields: []
    };
}

function movement(accountPublicId: string, amount: number, sens: TransactionMovement['sens']): TransactionMovement {
    return { accountPublicId, amount, sens };
}

function transaction(input: {
    publicId: string;
    type: TransactionType;
    label: string;
    amount: number;
    operationDate: string;
    accountPublicId: string;
    counterpartyAccountPublicId?: string;
    categoryPublicId?: string | null;
    tierPublicId?: string | null;
    tagPublicIds?: string[];
    savingsGoalPublicId?: string | null;
    taxNature?: string | null;
    taxNatureStatus?: 'confirmee' | 'ecartee' | null;
}): Transaction {
    const movements: TransactionMovement[] =
        input.type === 'transfert'
            ? [
                  movement(input.accountPublicId, input.amount, 'debit'),
                  movement(input.counterpartyAccountPublicId ?? '', input.amount, 'credit')
              ]
            : [movement(input.accountPublicId, input.amount, input.type === 'revenu' ? 'credit' : 'debit')];
    return {
        publicId: input.publicId,
        type: input.type,
        status: 'validee',
        source: 'manuelle',
        recurringExpensePublicId: null,
        recurringIncomePublicId: null,
        duePublicId: null,
        duePlannedAmount: null,
        label: input.label,
        amount: input.amount,
        currency: 'CHF',
        operationDate: input.operationDate,
        valueDate: input.operationDate,
        paymentMethodPublicId: input.type === 'depense' ? 'PM00001' : null,
        categoryPublicId: input.categoryPublicId ?? null,
        tierPublicId: input.tierPublicId ?? null,
        createdByUserPublicId: DEMO_USER_PUBLIC_ID,
        createdByDisplayName: 'Sacha Démo',
        createdByPhotoUrl: null,
        createdAt: `${input.operationDate}T08:00:00.000Z`,
        updatedAt: null,
        movements,
        files: [],
        savingsGoalPublicId: input.savingsGoalPublicId ?? null,
        tagPublicIds: input.tagPublicIds ?? [],
        assetPublicId: null,
        taxNature: input.taxNature ?? null,
        taxNatureStatus: input.taxNatureStatus ?? null
    };
}

export function createDemoDb(): DemoDb {
    const recurring = seedRecurringHousehold();
    const friendsDirectory = seedFriends();
    const wealth = seedWealth();
    const ubs: Account['bank'] = {
        tierPublicId: 'TIERUBS',
        name: 'UBS',
        bankPublicId: null,
        bankName: 'UBS Switzerland AG',
        bic: 'UBSWCHZH80A',
        iid: '00240'
    };
    return {
        settings: { ...USER_SETTINGS_DEFAULTS },
        accounts: [
            account('ACCCOUR', 'Compte courant', 'courant', 4820.4, true, ubs),
            account('ACCSAVE', 'Épargne', 'epargne', 18600, false, ubs),
            account('ACCCASH', 'Espèces', 'cash', 240, false, null),
            account('ACCINV1', 'Compte titres', 'investissement', 3940, false, ubs)
        ],
        categories: [
            tree(category('CATFOOD', 'Courses', 'depense', '#10B981', { icone: 'shopping-cart' }), [
                category('CATGROC', 'Supermarché', 'depense', '#10B981', { parentPublicId: 'CATFOOD', icone: 'building-store' }),
                category('CATMRKT', 'Marché', 'depense', '#10B981', { parentPublicId: 'CATFOOD', icone: 'leaf' }),
                category('CATBAKE', 'Boulangerie', 'depense', '#10B981', { parentPublicId: 'CATFOOD', icone: 'coffee' })
            ]),
            tree(category('CATRENT', 'Logement', 'depense', '#4F46E5', { icone: 'home' }), [
                category('CATLOYR', 'Loyer', 'depense', '#4F46E5', { parentPublicId: 'CATRENT', icone: 'home' }),
                category('CATFEES', 'Charges', 'depense', '#4F46E5', { parentPublicId: 'CATRENT', icone: 'bolt' }),
                category('CATREPR', 'Entretien', 'depense', '#4F46E5', { parentPublicId: 'CATRENT', icone: 'tools' })
            ]),
            tree(category('CATFUN1', 'Sorties', 'depense', '#F59E0B', { icone: 'music' }), [
                category('CATREST', 'Restaurants', 'depense', '#F59E0B', { parentPublicId: 'CATFUN1', icone: 'utensils' }),
                category('CATCAFE', 'Cafés', 'depense', '#F59E0B', { parentPublicId: 'CATFUN1', icone: 'coffee' })
            ]),
            tree(category('CATMOVE', 'Transports', 'depense', '#0EA5E9', { icone: 'bus' }), [
                category('CATPUBL', 'Transports publics', 'depense', '#0EA5E9', { parentPublicId: 'CATMOVE', icone: 'bus' }),
                category('CATFUEL', 'Carburant', 'depense', '#0EA5E9', { parentPublicId: 'CATMOVE', icone: 'flame' })
            ]),
            tree(category('CATSAL1', 'Salaire', 'revenu', '#2A9D8F', { icone: 'briefcase' }), [
                category('CATSALN', 'Salaire net', 'revenu', '#2A9D8F', { parentPublicId: 'CATSAL1', icone: 'cash' }),
                category('CAT13TH', '13e salaire', 'revenu', '#2A9D8F', { parentPublicId: 'CATSAL1', icone: 'star' })
            ]),
            tree(category('CATHLTH', 'Santé', 'depense', '#EF4444', { icone: 'heart' }), [
                category('CATHINS', 'Assurance maladie', 'depense', '#EF4444', {
                    parentPublicId: 'CATHLTH',
                    icone: 'heart',
                    taxNature: 'healthInsurancePremium'
                }),
                category('CATMEDX', 'Soins', 'depense', '#EF4444', {
                    parentPublicId: 'CATHLTH',
                    icone: 'receipt',
                    taxNature: 'medicalExpense'
                })
            ]),
            tree(category('CATSAVE', 'Épargne & prévoyance', 'transfert', '#0D9488', { icone: 'pig-money' }), [
                category('CAT3PIL', '3e pilier', 'transfert', '#0D9488', {
                    parentPublicId: 'CATSAVE',
                    icone: 'pig-money',
                    taxNature: 'pillar3aContribution'
                })
            ])
        ],
        transactions: [
            transaction({
                publicId: 'TXN0001',
                type: 'revenu',
                label: 'Salaire novembre',
                amount: 6200,
                operationDate: '2026-11-01',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATSALN'
            }),
            transaction({
                publicId: 'TXN0002',
                type: 'depense',
                label: 'Loyer',
                amount: 1850,
                operationDate: '2026-11-02',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATLOYR',
                tierPublicId: 'TIERREG',
                tagPublicIds: ['TAGHOME']
            }),
            transaction({
                publicId: 'TXN0003',
                type: 'depense',
                label: 'Migros',
                amount: 86.4,
                operationDate: '2026-11-05',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATGROC',
                tierPublicId: 'TIERMIG',
                tagPublicIds: ['TAGFOOD']
            }),
            transaction({
                publicId: 'TXN0004',
                type: 'depense',
                label: 'CFF',
                amount: 42,
                operationDate: '2026-11-08',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATPUBL'
            }),
            transaction({
                publicId: 'TXN0005',
                type: 'depense',
                label: 'Restaurant',
                amount: 64.5,
                operationDate: '2026-11-10',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATREST'
            }),
            transaction({
                publicId: 'TXN0006',
                type: 'transfert',
                label: 'Versement vacances',
                amount: 200,
                operationDate: '2026-11-12',
                accountPublicId: 'ACCCOUR',
                counterpartyAccountPublicId: 'ACCSAVE',
                savingsGoalPublicId: 'GOALVAC'
            }),
            transaction({
                publicId: 'TXN0007',
                type: 'revenu',
                label: 'Salaire octobre',
                amount: 6200,
                operationDate: '2026-10-01',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATSALN'
            }),
            transaction({
                publicId: 'TXN0008',
                type: 'depense',
                label: 'Loyer',
                amount: 1850,
                operationDate: '2026-10-02',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATLOYR',
                tierPublicId: 'TIERREG'
            }),
            transaction({
                publicId: 'TXN0009',
                type: 'depense',
                label: 'Migros',
                amount: 112.2,
                operationDate: '2026-10-18',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATGROC',
                tierPublicId: 'TIERMIG'
            }),
            // Nature fiscale : la catégorie suggère, la dernière est déjà confirmée.
            transaction({
                publicId: 'TXN0010',
                type: 'depense',
                label: 'Prime assurance maladie',
                amount: 412,
                operationDate: '2026-11-01',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATHINS'
            }),
            transaction({
                publicId: 'TXN0011',
                type: 'depense',
                label: 'Dr Martin',
                amount: 95,
                operationDate: '2026-10-22',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATMEDX'
            }),
            transaction({
                publicId: 'TXN0012',
                type: 'depense',
                label: 'Dentiste',
                amount: 180,
                operationDate: '2026-10-09',
                accountPublicId: 'ACCCOUR',
                categoryPublicId: 'CATMEDX',
                taxNature: 'medicalExpense',
                taxNatureStatus: 'confirmee'
            })
        ],
        budgets: [],
        assets: [
            {
                publicId: 'ASTCAR1',
                name: 'Volkswagen Golf',
                type: 'vehicule',
                estimatedValue: 18500,
                currency: 'CHF',
                acquisitionDate: '2022-06-01',
                acquisitionPrice: 24900,
                description: null,
                notes: null,
                isActive: true,
                lastValuationDate: '2026-10-01',
                isValueFromAccount: false,
                vehicle: {
                    brand: 'Volkswagen',
                    model: 'Golf',
                    vehicleType: 'voiture',
                    fuel: 'essence',
                    firstRegistrationYear: 2019,
                    plate: 'VD 123456',
                    currentMileage: 64200
                },
                crypto: null,
                valuableItem: null,
                savingsAccount: null,
                other: null,
                realEstate: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'ASTFLAT',
                name: 'Appartement Lausanne',
                type: 'immobilier',
                estimatedValue: 890000,
                currency: 'CHF',
                acquisitionDate: '2018-03-15',
                acquisitionPrice: 720000,
                description: null,
                notes: null,
                isActive: true,
                lastValuationDate: '2026-09-01',
                isValueFromAccount: false,
                vehicle: null,
                crypto: null,
                valuableItem: null,
                savingsAccount: null,
                other: null,
                realEstate: {
                    details: {
                        propertyType: 'appartement',
                        addressLine1: 'Avenue de Cour 12',
                        addressLine2: null,
                        postalCode: '1007',
                        city: 'Lausanne',
                        country: 'CH',
                        livingAreaM2: 78,
                        landAreaM2: null,
                        rooms: 3.5,
                        bedrooms: 2,
                        bathrooms: 1,
                        floor: 3,
                        hasElevator: true,
                        hasBalcony: true,
                        hasCellar: true,
                        hasGarage: false,
                        constructionYear: 1974,
                        renovationYear: 2016,
                        taxValue: 610000
                    },
                    summary: null
                },
                createdAt: NOW,
                updatedAt: null
            }
        ],
        paymentMethods: [
            {
                publicId: 'PM00001',
                accountPublicId: 'ACCCOUR',
                type: 'carte',
                label: 'Carte UBS',
                reference: null,
                lastFourDigits: '4242',
                expirationDate: '2028-08-31',
                isActive: true,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'PM00002',
                accountPublicId: 'ACCCOUR',
                type: 'twint',
                label: 'TWINT',
                reference: null,
                lastFourDigits: null,
                expirationDate: null,
                isActive: true,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'PM00003',
                accountPublicId: 'ACCCOUR',
                type: 'prelevement',
                label: 'Prélèvement loyer',
                reference: 'Régie du Lac',
                lastFourDigits: null,
                expirationDate: null,
                isActive: true,
                createdAt: NOW,
                updatedAt: null
            }
        ],
        tags: [
            {
                publicId: 'TAGFOOD',
                name: 'Courses',
                color: '#10B981',
                transactionCount: 2,
                recurringExpenseCount: 0,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TAGHOME',
                name: 'Maison',
                color: '#4F46E5',
                transactionCount: 1,
                recurringExpenseCount: 0,
                createdAt: NOW,
                updatedAt: null
            }
        ],
        tiers: [
            {
                publicId: 'TIERUBS',
                name: 'UBS',
                nature: 'company',
                email: null,
                phone: null,
                website: 'https://www.ubs.com',
                notes: null,
                roles: ['banque'],
                person: null,
                company: { legalName: 'UBS Switzerland AG', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: { bankPublicId: 'bank-00240', bankName: 'UBS Switzerland AG', bic: 'UBSWCHZH80A', iid: '00240', countryCode: 'CH' },
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERPOF',
                name: 'PostFinance',
                nature: 'company',
                email: null,
                phone: null,
                website: 'https://www.postfinance.ch',
                notes: null,
                roles: ['banque'],
                person: null,
                company: { legalName: 'PostFinance AG', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: { bankPublicId: 'bank-09000', bankName: 'PostFinance AG', bic: 'POFICHBEXXX', iid: '09000', countryCode: 'CH' },
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERRFF',
                name: 'Raiffeisen',
                nature: 'company',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['banque'],
                person: null,
                company: { legalName: 'Banque Raiffeisen', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: { bankPublicId: 'bank-80808', bankName: 'Banque Raiffeisen', bic: 'RAIFCH22XXX', iid: '80808', countryCode: 'CH' },
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIEREMP',
                name: 'Atelier Horizon',
                nature: 'company',
                email: 'rh@atelier-horizon.ch',
                phone: null,
                website: null,
                notes: null,
                roles: ['employeur'],
                person: null,
                company: { legalName: 'Atelier Horizon SA', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERCSS',
                name: 'CSS Assurance',
                nature: 'company',
                email: null,
                phone: null,
                website: 'https://www.css.ch',
                notes: null,
                roles: ['assurance'],
                person: null,
                company: { legalName: 'CSS Assurance', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERCFF',
                name: 'CFF',
                nature: 'company',
                email: null,
                phone: null,
                website: 'https://www.cff.ch',
                notes: null,
                roles: ['service'],
                person: null,
                company: { legalName: 'Chemins de fer fédéraux', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERSWC',
                name: 'Swisscom',
                nature: 'company',
                email: null,
                phone: null,
                website: 'https://www.swisscom.ch',
                notes: null,
                roles: ['service'],
                person: null,
                company: { legalName: 'Swisscom SA', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERNFL',
                name: 'Netflix',
                nature: 'company',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['fournisseur'],
                person: null,
                company: { legalName: 'Netflix International', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERMAR',
                name: 'Marie Dubois',
                nature: 'person',
                email: 'marie.dubois@example.ch',
                phone: '+41 79 000 00 00',
                website: null,
                notes: null,
                roles: ['contactPersonnel'],
                person: { firstName: 'Marie', lastName: 'Dubois', birthDate: null },
                company: null,
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERDOC',
                name: 'Dr Alain Rochat',
                nature: 'person',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['medecin'],
                person: { firstName: 'Alain', lastName: 'Rochat', birthDate: null },
                company: null,
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERIMP',
                name: 'Administration cantonale des impôts',
                nature: 'administration',
                email: null,
                phone: null,
                website: null,
                notes: 'Canton de Vaud',
                roles: ['administration'],
                person: null,
                company: null,
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERCRX',
                name: 'Croix-Rouge vaudoise',
                nature: 'organization',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['other'],
                person: null,
                company: null,
                organization: { officialName: 'Croix-Rouge vaudoise', organizationType: 'association' },
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERMIG',
                name: 'Migros',
                nature: 'company',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['fournisseur'],
                person: null,
                company: { legalName: 'Migros', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            },
            {
                publicId: 'TIERREG',
                name: 'Régie du Lac',
                nature: 'company',
                email: null,
                phone: null,
                website: null,
                notes: null,
                roles: ['bailleur'],
                person: null,
                company: { legalName: 'Régie du Lac', vatNumber: null, companyRegistrationNumber: null },
                organization: null,
                bank: null,
                createdAt: NOW,
                updatedAt: null
            }
        ],
        notifications: [
            {
                id: 1,
                type: 'budgetAlert',
                title: 'Budget Courses',
                subtitle: 'Novembre',
                message: 'Les courses approchent de l’enveloppe du mois.',
                metadata: null,
                isRead: false,
                readAt: null,
                link: '/app/planning/budgets/BDGFOOD',
                photoUrl: null,
                createdAt: '2026-11-12T18:00:00.000Z'
            },
            {
                id: 2,
                type: 'other',
                title: 'Bienvenue dans la démo',
                subtitle: null,
                message: 'Ajoutez une transaction : elle reste dans ce navigateur.',
                metadata: null,
                isRead: false,
                readAt: null,
                link: '/app/finances/transactions',
                photoUrl: null,
                createdAt: '2026-11-14T08:00:00.000Z'
            }
        ],
        ...recurring,
        friendsDirectory,
        ...wealth,
        files: [],
        fileBlobs: {},
        taxReturns: seedTaxReturns(),
        aliases: {
            TIERMIG: [
                {
                    publicId: 'ALS0001',
                    value: 'MIGROS',
                    matchType: 'contains',
                    priority: 0,
                    isActive: true,
                    createdByImport: false,
                    createdAt: NOW,
                    updatedAt: null
                }
            ]
        },
        goals: [],
        assetValuations: {
            ASTCAR1: [{ valuationDate: '2026-10-01', value: 18500, source: 'manuelle', createdAt: NOW, updatedAt: null }],
            ASTFLAT: [{ valuationDate: '2026-09-01', value: 890000, source: 'manuelle', createdAt: NOW, updatedAt: null }]
        },
        assetMileages: {
            ASTCAR1: [{ statementDate: '2026-10-01', kilometrage: 64200, source: 'manuelle', createdAt: NOW }]
        },
        assetMaintenances: {
            ASTCAR1: [
                {
                    publicId: 'MNT0001',
                    maintenanceDate: '2026-06-12',
                    maintenanceType: 'revision',
                    kilometrage: 61000,
                    garageTierPublicId: null,
                    garageTierName: null,
                    cost: 480,
                    currency: 'CHF',
                    transactionPublicId: null,
                    description: 'Révision annuelle',
                    nextMaintenanceDate: null,
                    nextMaintenanceKm: 70000,
                    createdAt: NOW,
                    updatedAt: null
                }
            ]
        }
    };
}

export function periodBounds(periode: Budget['periode'], startDate: string): { periodStart: string; periodEnd: string } {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(start);
    if (periode === 'hebdomadaire') end.setDate(end.getDate() + 6);
    else if (periode === 'trimestriel') end.setMonth(end.getMonth() + 3, end.getDate() - 1);
    else if (periode === 'annuel') end.setFullYear(end.getFullYear() + 1, end.getMonth(), end.getDate() - 1);
    else end.setMonth(end.getMonth() + 1, 0);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    return { periodStart: iso(start), periodEnd: iso(end) };
}

/** La catégorie du budget et ses sous-catégories. */
function budgetCategoryIds(db: DemoDb, publicId: string | null): Set<string> | null {
    if (!publicId) return null;
    const ids = new Set([publicId]);
    const root = db.categories.find((item) => item.publicId === publicId);
    for (const child of root?.children ?? []) ids.add(child.publicId);
    return ids;
}

function spentForBudget(db: DemoDb, budget: Budget): number {
    const ids = budgetCategoryIds(db, budget.categoryPublicId);
    return roundMoney(
        db.transactions
            .filter((tx) => tx.type === 'depense' && (ids ? ids.has(tx.categoryPublicId ?? '') : tx.categoryPublicId == null))
            .filter((tx) => tx.operationDate >= budget.periodStart && tx.operationDate <= budget.periodEnd)
            .reduce((sum, tx) => sum + (tx.amount ?? 0), 0)
    );
}

export function refreshBudgets(db: DemoDb): void {
    const today = new Date().toISOString().slice(0, 10);
    for (const budget of db.budgets) {
        const spent = spentForBudget(db, budget);
        budget.spentAmount = spent;
        budget.remainingAmount = roundMoney(budget.limitAmount - spent);
        budget.percentUsed = budget.limitAmount > 0 ? roundMoney((spent / budget.limitAmount) * 100) : 0;
        budget.isCurrent = today >= budget.periodStart && today <= budget.periodEnd;
    }
}

function goalFromTransactions(db: DemoDb, goal: SavingsGoal): void {
    const linked = db.transactions.filter((tx) => tx.savingsGoalPublicId === goal.publicId && tx.currency === goal.currency);
    const contributed = roundMoney(linked.reduce((sum, tx) => sum + (tx.type === 'revenu' ? -(tx.amount ?? 0) : (tx.amount ?? 0)), 0));
    goal.contributedAmount = contributed;
    goal.currentAmount = roundMoney(goal.openingAmount + contributed);
    goal.remainingAmount = roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount));
    goal.percentReached = goal.targetAmount > 0 ? roundMoney((goal.currentAmount / goal.targetAmount) * 100) : 0;
    goal.isOverdue = !!goal.targetDate && goal.targetDate < new Date().toISOString().slice(0, 10) && goal.currentAmount < goal.targetAmount;
    goal.contributions = linked
        .slice()
        .sort((a, b) => b.operationDate.localeCompare(a.operationDate))
        .slice(0, 20)
        .map((tx) => ({
            transactionPublicId: tx.publicId,
            label: tx.label,
            operationDate: tx.operationDate,
            amount: tx.type === 'depense' ? -(tx.amount ?? 0) : (tx.amount ?? 0)
        }));
}

export function refreshGoals(db: DemoDb): void {
    for (const goal of db.goals) goalFromTransactions(db, goal);
}

function seedBudgetsAndGoals(db: DemoDb): void {
    const foodBounds = periodBounds('mensuel', '2026-11-01');
    const funBounds = periodBounds('mensuel', '2026-11-01');
    db.budgets = [
        {
            publicId: 'BDGFOOD',
            name: 'Courses',
            limitAmount: 500,
            currency: 'CHF',
            periode: 'mensuel',
            startDate: '2026-11-01',
            endDate: null,
            isActive: true,
            categoryPublicId: 'CATFOOD',
            ...foodBounds,
            spentAmount: 0,
            remainingAmount: 500,
            percentUsed: 0,
            isCurrent: true,
            createdAt: NOW,
            updatedAt: null
        },
        {
            publicId: 'BDGFUN1',
            name: 'Sorties',
            limitAmount: 200,
            currency: 'CHF',
            periode: 'mensuel',
            startDate: '2026-11-01',
            endDate: null,
            isActive: true,
            categoryPublicId: 'CATFUN1',
            ...funBounds,
            spentAmount: 0,
            remainingAmount: 200,
            percentUsed: 0,
            isCurrent: true,
            createdAt: NOW,
            updatedAt: null
        }
    ];
    db.goals = [
        {
            publicId: 'GOALVAC',
            name: 'Vacances d’été',
            targetAmount: 3000,
            openingAmount: 800,
            contributedAmount: 0,
            currentAmount: 800,
            remainingAmount: 2200,
            percentReached: 0,
            currency: 'CHF',
            targetDate: '2027-06-01',
            projectedDate: null,
            status: 'active',
            isOverdue: false,
            accountPublicId: 'ACCSAVE',
            contributions: [],
            createdAt: NOW,
            updatedAt: null
        }
    ];
    refreshBudgets(db);
    refreshGoals(db);
}

let db = createDemoDb();
seedBudgetsAndGoals(db);

export function demoDb(): DemoDb {
    return db;
}

export function resetDemoDb(): void {
    db = createDemoDb();
    seedBudgetsAndGoals(db);
}

export function applyMovement(tx: Transaction, sign: 1 | -1): void {
    for (const move of tx.movements) {
        if (move.amount == null) continue;
        const acc = db.accounts.find((item) => item.publicId === move.accountPublicId);
        if (!acc || acc.currentBalance == null) continue;
        const delta = move.sens === 'credit' ? move.amount : -move.amount;
        acc.currentBalance = roundMoney(acc.currentBalance + sign * delta);
    }
}

export function buildMovements(
    type: TransactionType,
    accountPublicId: string,
    amount: number,
    counterparty?: string | null
): TransactionMovement[] {
    if (type === 'transfert') {
        return [movement(accountPublicId, amount, 'debit'), movement(counterparty ?? '', amount, 'credit')];
    }
    return [movement(accountPublicId, amount, type === 'revenu' ? 'credit' : 'debit')];
}

export function emptyPage(query: URLSearchParams, pageSizeDefault = 20) {
    const page = Math.max(1, Number(query.get('page') ?? 1) || 1);
    const pageSize = Math.max(1, Number(query.get('pageSize') ?? pageSizeDefault) || pageSizeDefault);
    return { items: [] as unknown[], page, pageSize, totalCount: 0 };
}

export function pageOf<T>(items: T[], query: URLSearchParams, pageSizeDefault = 50) {
    const page = Math.max(1, Number(query.get('page') ?? 1) || 1);
    const pageSize = Math.max(1, Number(query.get('pageSize') ?? pageSizeDefault) || pageSizeDefault);
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), page, pageSize, totalCount: items.length };
}

export function netWorthOverview(): NetWorthOverview {
    const accounts = db.accounts.filter((item) => item.isActive);
    const totalAccounts = roundMoney(accounts.reduce((sum, item) => sum + (item.currentBalance ?? 0), 0));
    const assets = db.assets.filter((item) => item.isActive);
    const totalAssets = roundMoney(assets.reduce((sum, item) => sum + item.estimatedValue, 0));
    const activeLiabilities = db.liabilities.filter((item) => item.status === 'active');
    const totalLiabilities = roundMoney(activeLiabilities.reduce((sum, item) => sum + item.remainingAmount, 0));
    const investments = roundMoney(
        accounts
            .filter((item) => item.type === 'investissement' || item.type === 'crypto')
            .reduce((sum, item) => sum + (item.currentBalance ?? 0), 0)
    );
    return {
        currency: 'CHF',
        asOf: new Date().toISOString().slice(0, 10),
        totalAccounts,
        totalAssets,
        totalLiabilities,
        netWorth: roundMoney(totalAccounts + totalAssets - totalLiabilities),
        investments,
        investmentsWithoutQuote: 0,
        accountsByType: [
            {
                type: 'courant',
                count: accounts.filter((a) => a.type === 'courant').length,
                total: accounts.filter((a) => a.type === 'courant').reduce((s, a) => s + (a.currentBalance ?? 0), 0)
            },
            {
                type: 'epargne',
                count: accounts.filter((a) => a.type === 'epargne').length,
                total: accounts.filter((a) => a.type === 'epargne').reduce((s, a) => s + (a.currentBalance ?? 0), 0)
            },
            {
                type: 'cash',
                count: accounts.filter((a) => a.type === 'cash').length,
                total: accounts.filter((a) => a.type === 'cash').reduce((s, a) => s + (a.currentBalance ?? 0), 0)
            }
        ].filter((bucket) => bucket.count > 0),
        assetsByType: [...new Map(assets.map((asset) => [asset.type, asset])).keys()].map((type) => ({
            type,
            count: assets.filter((asset) => asset.type === type).length,
            total: roundMoney(assets.filter((asset) => asset.type === type).reduce((sum, asset) => sum + asset.estimatedValue, 0))
        })),
        liabilitiesByType: [...new Set(activeLiabilities.map((item) => item.type))].map((type) => ({
            type,
            count: activeLiabilities.filter((item) => item.type === type).length,
            total: roundMoney(activeLiabilities.filter((item) => item.type === type).reduce((sum, item) => sum + item.remainingAmount, 0))
        })),
        friendsBalance: {
            receivable: roundMoney(
                db.sharedDebts
                    .filter((item) => item.role === 'creditor' && item.status !== 'canceled')
                    .reduce((sum, item) => sum + item.remainingAmount, 0) +
                    db.personalLoans
                        .filter((item) => item.direction === 'pret' && item.status === 'active')
                        .reduce((sum, item) => sum + item.remainingAmount, 0)
            ),
            payable: roundMoney(
                db.sharedDebts
                    .filter((item) => item.role === 'debtor' && item.status !== 'canceled')
                    .reduce((sum, item) => sum + item.remainingAmount, 0) +
                    db.personalLoans
                        .filter((item) => item.direction === 'emprunt' && item.status === 'active')
                        .reduce((sum, item) => sum + item.remainingAmount, 0)
            )
        },
        excluded: [],
        lastSnapshot: { periode: '2026-10-01', netWorth: totalAccounts + totalAssets - totalLiabilities - 1200, delta: 1200 }
    };
}

export function netWorthSnapshots(): NetWorthSnapshot[] {
    const current = netWorthOverview();
    const months = ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'];
    return months.map((periode, index) => {
        const netWorth = roundMoney(current.netWorth - (months.length - 1 - index) * 1800);
        return {
            periode,
            totalAccounts: current.totalAccounts,
            totalAssets: current.totalAssets,
            totalLiabilities: current.totalLiabilities,
            netWorth,
            monthlyIncome: 6200,
            monthlyExpenses: 2100,
            savingsRate: 66,
            currency: 'CHF',
            computedAt: `${periode}T06:00:00.000Z`
        };
    });
}

export function currencyOr(value: unknown, fallback: Currency): Currency {
    return value === 'EUR' || value === 'USD' || value === 'GBP' || value === 'CHF' ? value : fallback;
}

export function goalStatus(goal: SavingsGoal): SavingsGoalStatus {
    if (goal.status === 'abandonne') return 'abandonne';
    return goal.currentAmount >= goal.targetAmount ? 'atteint' : 'active';
}
