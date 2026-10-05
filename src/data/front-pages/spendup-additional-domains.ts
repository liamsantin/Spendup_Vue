import type { Component } from 'vue';
import {
    TagsIcon,
    TrendingUpIcon,
    RepeatIcon,
    AlertTriangleIcon,
    ChartLineIcon,
    UsersIcon,
    BellIcon,
    CalendarIcon,
    ShieldLockIcon,
    WalletIcon,
    CurrencyFrankIcon,
    FileInvoiceIcon,
    BriefcaseIcon
} from 'vue-tabler-icons';
import AlertsScene from '@/components/frontpages/mockups/scenes/AlertsScene.vue';
import AnomaliesScene from '@/components/frontpages/mockups/scenes/AnomaliesScene.vue';
import CalendarScene from '@/components/frontpages/mockups/scenes/CalendarScene.vue';
import CategorisationScene from '@/components/frontpages/mockups/scenes/CategorisationScene.vue';
import EmployerScene from '@/components/frontpages/mockups/scenes/EmployerScene.vue';
import InvestScene from '@/components/frontpages/mockups/scenes/InvestScene.vue';
import NetworkScene from '@/components/frontpages/mockups/scenes/NetworkScene.vue';
import RecurringIncomeScene from '@/components/frontpages/mockups/scenes/RecurringIncomeScene.vue';
import SecurityScene from '@/components/frontpages/mockups/scenes/SecurityScene.vue';
import SubscriptionsScene from '@/components/frontpages/mockups/scenes/SubscriptionsScene.vue';

export type DomainCard = {
    title: string;
    icon: Component;
    items: string[];
    intro?: string;
    sheetClass?: string;
    toneClass?: string;
};

export type SpendupAdditionalDomain = {
    id: string;
    icon: Component;
    /** Étiquette courte affichée à côté du numéro de section. */
    kicker: string;
    title: string;
    lead: string;
    footer?: string;
    items?: string[];
    cards?: DomainCard[];
    /** Groupe de la grille « Dans le détail » de la page Fonctionnalités. */
    group: SpendupDomainGroupId;
    /** Maquette produit codée qui illustre le domaine. */
    scene: Component;
};

export type SpendupDomainGroupId = 'organiser' | 'revenus' | 'proteger';

export type SpendupDomainGroup = {
    id: SpendupDomainGroupId;
    number: string;
    kicker: string;
    title: string;
    lead: string;
};

/** Les domaines métiers couverts (bandeau de la page Fonctionnalités, section plateforme de l'accueil). */
export const spendupDomainNames = [
    'Comptes',
    'Transactions',
    'Moyens de paiement',
    'Catégories & tags',
    'Tiers',
    'Imports de relevés',
    'Justificatifs',
    'Budgets',
    'Objectifs d’épargne',
    'Revenus récurrents',
    'Abonnements',
    'Calendrier',
    'Employeurs & salaires',
    'Patrimoine',
    'Immobilier',
    'Placements',
    'Crypto',
    'Alertes',
    'Famille & partage',
    'Sécurité'
];

/** Groupes de la grille « Dans le détail » : trois familles de besoins plutôt que dix sections identiques. */
export const spendupDomainGroups: SpendupDomainGroup[] = [
    {
        id: 'organiser',
        number: '05',
        kicker: 'Organiser & contrôler',
        title: 'Des données propres, classées, fiables.',
        lead: 'Catégories, règles, tiers et contrôles à chaque import : votre historique reste lisible et juste, sans effort de tri.'
    },
    {
        id: 'revenus',
        number: '06',
        kicker: 'Revenus & échéances',
        title: 'Ce qui entre, ce qui sort, et quand.',
        lead: 'Salaires, loyers, abonnements et échéances réunis dans le temps pour anticiper chaque fin de mois.'
    },
    {
        id: 'proteger',
        number: '07',
        kicker: 'Investir & protéger',
        title: 'Faire grandir, être prévenu, rester protégé.',
        lead: 'Placements, alertes et sécurité travaillent ensemble pour que rien d’important ne vous échappe.'
    }
];

/** Domaines métier complémentaires — contenu enrichi sans duplication avec les sections existantes. */
export const spendupAdditionalDomains: SpendupAdditionalDomain[] = [
    {
        id: 'categorisation',
        group: 'organiser',
        scene: CategorisationScene,
        kicker: 'Organiser',
        icon: TagsIcon,
        title: 'Catégorisation & organisation',
        lead: 'Classez vos opérations avec catégories, tags et règles pour analyser vos habitudes.',
        cards: [
            {
                title: 'Catégories & tags',
                icon: TagsIcon,
                items: ['catégories personnalisées dépenses et revenus', 'tags thématiques : vacances, impôts, travaux']
            },
            {
                title: 'Automatisation',
                icon: TagsIcon,
                items: ['règles sur libellé, montant ou tiers', "classement intelligent à l'import"]
            }
        ],
        footer: 'Exemple : chaque achat « Migros » est classé automatiquement en « Alimentation ».'
    },
    {
        id: 'revenus-recurrents',
        group: 'revenus',
        scene: RecurringIncomeScene,
        kicker: 'Anticiper',
        icon: TrendingUpIcon,
        title: 'Revenus récurrents',
        lead: "Anticipez vos entrées d'argent régulières et reliez-les à vos projections financières.",
        cards: [
            {
                title: 'Revenus du quotidien',
                icon: TrendingUpIcon,
                items: ['salaires et pensions', 'revenus indépendants']
            },
            {
                title: 'Revenus patrimoniaux',
                icon: ChartLineIcon,
                items: ['loyers et revenus locatifs', 'échéances générées automatiquement', "lien avec vos objectifs d'épargne"]
            }
        ],
        footer: "Chaque revenu récurrent peut alimenter vos prévisions et vos objectifs d'épargne."
    },
    {
        id: 'employeurs-salaires',
        group: 'revenus',
        scene: EmployerScene,
        kicker: 'Carrière',
        icon: BriefcaseIcon,
        title: 'Employeurs, contrats & salaires',
        lead: 'Reliez votre vie professionnelle à vos finances : contrats, bulletins et historique au même endroit.',
        cards: [
            {
                title: 'Employeurs & contrats',
                icon: BriefcaseIcon,
                items: ['employeurs, postes et dates clés', 'contrats, taux d’activité et évolutions']
            },
            {
                title: 'Salaires & retenues',
                icon: FileInvoiceIcon,
                items: [
                    'bulletins de salaire et retenues',
                    'lien direct avec vos revenus récurrents',
                    'préparation de la déclaration fiscale'
                ]
            }
        ],
        footer: 'Chaque salaire enregistré alimente automatiquement vos revenus et vos projections.'
    },
    {
        id: 'tiers-paiements',
        group: 'organiser',
        scene: NetworkScene,
        kicker: 'Réseau',
        icon: UsersIcon,
        title: 'Réseau, tiers & moyens de paiement',
        lead: 'Identifiez qui intervient dans chaque opération financière.',
        cards: [
            {
                title: 'Tiers & réseau',
                icon: UsersIcon,
                items: ['personnes, entreprises et organisations', "relations et demandes d'amis"]
            },
            {
                title: 'Moyens de paiement',
                icon: WalletIcon,
                items: ['carte, virement, espèces', 'liens avec transactions, prêts et contrats']
            }
        ]
    },
    {
        id: 'anomalies',
        group: 'organiser',
        scene: AnomaliesScene,
        kicker: 'Contrôler',
        icon: AlertTriangleIcon,
        title: 'Anomalies & qualité des données',
        lead: 'Chaque relevé importé est contrôlé : doublons, écarts et montants inhabituels sont signalés avant de fausser vos chiffres.',
        cards: [
            {
                title: 'Détection intelligente',
                icon: AlertTriangleIcon,
                items: ['montants inhabituels et doublons', 'hausse de facture ou catégorie suspecte']
            },
            {
                title: 'Traitement des alertes',
                icon: ShieldLockIcon,
                items: ['statuts nouvelle, confirmée ou résolue', "contrôle à l'import", 'historique plus fiable']
            }
        ]
    },
    {
        id: 'investissements-crypto',
        group: 'proteger',
        scene: InvestScene,
        kicker: 'Investir',
        icon: ChartLineIcon,
        title: 'Investissements & crypto',
        lead: 'Intégrez placements financiers et actifs crypto dans votre vision patrimoniale globale.',
        cards: [
            {
                title: 'Investissements',
                icon: ChartLineIcon,
                items: ['instruments, positions et opérations', 'comptes et valorisations associés']
            },
            {
                title: 'Cryptomonnaies',
                icon: WalletIcon,
                items: ['actifs crypto suivis', 'valorisation historique', 'intégration au patrimoine net']
            }
        ],
        footer: 'Complète le suivi immobilier et véhicules déjà proposé sur la plateforme.'
    },
    {
        id: 'depenses-abonnements',
        group: 'revenus',
        scene: SubscriptionsScene,
        kicker: 'Récurrent',
        icon: RepeatIcon,
        title: 'Dépenses récurrentes & abonnements',
        lead: "Centralisez charges et abonnements pour anticiper l'impact sur votre budget.",
        cards: [
            {
                title: 'Charges régulières',
                icon: RepeatIcon,
                items: ['loyer, assurances et crédits', 'fournisseurs et mensualités prévisibles']
            },
            {
                title: 'Abonnements',
                icon: RepeatIcon,
                items: [
                    'streaming, logiciels et services',
                    'détection automatique depuis vos transactions',
                    'prochaines échéances et participants'
                ]
            }
        ],
        footer: 'Définissez fréquence et montants pour anticiper les paiements et éviter les oublis.'
    },
    {
        id: 'alertes-notifications',
        group: 'proteger',
        scene: AlertsScene,
        kicker: 'Alerter',
        icon: BellIcon,
        title: 'Alertes & notifications',
        lead: 'Restez informé des événements importants sans avoir à tout vérifier vous-même.',
        cards: [
            {
                title: 'Alertes financières',
                icon: BellIcon,
                items: ['budget dépassé et dépense inhabituelle', 'échéance à venir et risque financier']
            },
            {
                title: 'Notifications',
                icon: UsersIcon,
                items: ['sécurité du compte', "demandes d'amis", 'rappels et préférences e-mail ou push']
            }
        ]
    },
    {
        id: 'calendrier',
        group: 'revenus',
        scene: CalendarScene,
        kicker: 'Planifier',
        icon: CalendarIcon,
        title: 'Calendrier & échéances',
        lead: 'Reliez vos finances à des dates clés : paiements, objectifs et rappels.',
        cards: [
            {
                title: 'Planification',
                icon: CalendarIcon,
                items: ['dépenses et revenus dans le temps', 'calendriers, événements et invitations']
            },
            {
                title: 'Suivi',
                icon: CalendarIcon,
                items: ['rappels et récurrences automatisées', 'visualisation cashflow et échéances']
            }
        ],
        footer: 'Les événements récurrents automatisent ce qui se répète : loyer, salaire, abonnements, etc.'
    },
    {
        id: 'securite-devises',
        group: 'proteger',
        scene: SecurityScene,
        kicker: 'Protéger',
        icon: ShieldLockIcon,
        title: 'Sécurité, conformité & multi-devises',
        lead: 'Protégez vos données et gérez vos finances en multi-devises en toute confiance.',
        cards: [
            {
                title: 'Sécurité & conformité',
                icon: ShieldLockIcon,
                items: ['2FA, sessions et appareils connectés', 'journal de sécurité, conformité nLPD et RGPD']
            },
            {
                title: 'Multi-devises',
                icon: CurrencyFrankIcon,
                items: [
                    'devise par compte, transaction ou actif',
                    'taux de change et CHF par défaut',
                    "préférences d'affichage et de compte"
                ]
            }
        ]
    }
];
