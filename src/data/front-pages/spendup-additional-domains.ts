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
    CurrencyEuroIcon
} from 'vue-tabler-icons';

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
    title: string;
    lead: string;
    footer?: string;
    items?: string[];
    cards?: DomainCard[];
    bgClass: 'bg-lightprimary' | 'bg-surface';
    image: string;
    imageAlt: string;
};

const FEATURES_IMG = '/assets/images/landingpage/features';

/** Domaines métier complémentaires — contenu enrichi sans duplication avec les sections existantes. */
export const spendupAdditionalDomains: SpendupAdditionalDomain[] = [
    {
        id: 'categorisation',
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
        footer: 'Exemple : une transaction « Netflix » classée automatiquement en « Abonnements ».',
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/categorization-organization.png`,
        imageAlt: 'Catégorisation et organisation des transactions'
    },
    {
        id: 'revenus-recurrents',
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
        footer: "Chaque revenu récurrent peut alimenter vos prévisions et vos objectifs d'épargne.",
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/recurring-income.png`,
        imageAlt: 'Suivi des revenus récurrents'
    },
    {
        id: 'tiers-paiements',
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
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/friends.png`,
        imageAlt: 'Réseau et collaboration entre utilisateurs'
    },
    {
        id: 'anomalies',
        icon: AlertTriangleIcon,
        title: 'Anomalies & qualité des données',
        lead: 'Surveillez la fiabilité de vos données financières grâce à une logique de contrôle continue.',
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
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/anomaly-detection.png`,
        imageAlt: "Détection d'anomalies financières"
    },
    {
        id: 'investissements-crypto',
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
        footer: 'Complète le suivi immobilier et véhicules déjà proposé sur la plateforme.',
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/investments-crypto.jpg`,
        imageAlt: 'Sécurisation des actifs et crypto'
    },
    {
        id: 'depenses-abonnements',
        icon: RepeatIcon,
        title: 'Dépenses récurrents & abonnements',
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
        footer: 'Définissez fréquence et montants pour anticiper les paiements et éviter les oublis.',
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/subscriptions-bills.png`,
        imageAlt: 'Gestion des abonnements et charges'
    },
    {
        id: 'alertes-notifications',
        icon: BellIcon,
        title: 'Alertes & notifications',
        lead: 'Restez informé des événements importants sans surveiller constamment vos comptes.',
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
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/alerts-notifications.png`,
        imageAlt: 'Célébration et notifications positives'
    },
    {
        id: 'calendrier',
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
        footer: 'Les événements récurrents automatisent ce qui se répète : loyer, salaire, abonnements, etc.',
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/calendar-planning.png`,
        imageAlt: 'Calendrier et planification financière'
    },
    {
        id: 'securite-devises',
        icon: ShieldLockIcon,
        title: 'Sécurité, conformité & multi-devises',
        lead: 'Protégez vos données et gérez vos finances en multi-devises en toute confiance.',
        cards: [
            {
                title: 'Sécurité & conformité',
                icon: ShieldLockIcon,
                items: ['2FA, sessions et appareils connectés', 'journal de sécurité et conformité RGPD']
            },
            {
                title: 'Multi-devises',
                icon: CurrencyEuroIcon,
                items: [
                    'devise par compte, transaction ou actif',
                    'taux de change et CHF par défaut',
                    "préférences d'affichage et de compte"
                ]
            }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/security-compliance.png`,
        imageAlt: 'Sécurité et conformité des données'
    }
];
