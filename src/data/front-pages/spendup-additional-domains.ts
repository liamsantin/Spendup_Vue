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
    CurrencyEuroIcon,
    FileInvoiceIcon,
    BriefcaseIcon
} from 'vue-tabler-icons';

export type DomainCard = {
    title: string;
    icon: Component;
    items: string[];
    intro?: string;
    sheetClass?: string;
    toneClass?: string;
};

export type DomainFloat = {
    label: string;
    value: string;
    tone: 'success' | 'alert' | 'info';
};

export type SpendupAdditionalDomain = {
    id: string;
    icon: Component;
    /** Étiquette courte affichée à côté du numéro de section. */
    kicker: string;
    title: string;
    lead: string;
    /** Pastilles flottantes autour de l’illustration. */
    floats: DomainFloat[];
    footer?: string;
    items?: string[];
    cards?: DomainCard[];
    bgClass: 'bg-lightprimary' | 'bg-surface';
    image: string;
    imageAlt: string;
};

const FEATURES_IMG = '/assets/images/front-pages/features';

/** Domaines métier complémentaires — contenu enrichi sans duplication avec les sections existantes. */
export const spendupAdditionalDomains: SpendupAdditionalDomain[] = [
    {
        id: 'categorisation',
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
        footer: 'Exemple : une transaction « Netflix » classée automatiquement en « Abonnements ».',
        floats: [
            { label: 'Règles actives', value: '12', tone: 'info' },
            { label: 'Netflix', value: 'Abonnements', tone: 'success' },
            { label: 'Tag', value: 'Vacances', tone: 'info' }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/domain-categorisation.png`,
        imageAlt: 'Catégorisation et organisation des transactions'
    },
    {
        id: 'revenus-recurrents',
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
        footer: "Chaque revenu récurrent peut alimenter vos prévisions et vos objectifs d'épargne.",
        floats: [
            { label: 'Salaire', value: 'Le 25', tone: 'info' },
            { label: 'Loyer perçu', value: 'CHF 1’450', tone: 'success' },
            { label: 'Prévision', value: '+3 mois', tone: 'info' }
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/domain-recurring-income.png`,
        imageAlt: 'Suivi des revenus récurrents'
    },
    {
        id: 'employeurs-salaires',
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
        footer: 'Chaque salaire enregistré alimente automatiquement vos revenus et vos projections.',
        floats: [
            { label: 'Contrat', value: '100 %', tone: 'info' },
            { label: 'Bulletin', value: 'Importé', tone: 'success' },
            { label: 'Fiscalité', value: 'Prête', tone: 'info' }
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/feature-employers.png`,
        imageAlt: 'Suivi des employeurs, contrats et salaires'
    },
    {
        id: 'tiers-paiements',
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
        ],
        floats: [
            { label: 'Tiers', value: '48 contacts', tone: 'info' },
            { label: 'Paiement', value: 'Carte ••42', tone: 'info' },
            { label: 'Demande d’ami', value: 'Acceptée', tone: 'success' }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/domain-network.png`,
        imageAlt: 'Réseau et collaboration entre utilisateurs'
    },
    {
        id: 'anomalies',
        kicker: 'Contrôler',
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
        floats: [
            { label: 'Doublon', value: 'Détecté', tone: 'alert' },
            { label: 'Facture', value: '+38 %', tone: 'alert' },
            { label: 'Alerte', value: 'Résolue', tone: 'success' }
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/domain-anomalies.png`,
        imageAlt: "Détection d'anomalies financières"
    },
    {
        id: 'investissements-crypto',
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
        footer: 'Complète le suivi immobilier et véhicules déjà proposé sur la plateforme.',
        floats: [
            { label: 'Portefeuille', value: '+4.8 %', tone: 'success' },
            { label: 'Bitcoin', value: '0.12 BTC', tone: 'info' },
            { label: 'Patrimoine net', value: 'À jour', tone: 'info' }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/domain-investments.jpg`,
        imageAlt: 'Sécurisation des actifs et crypto'
    },
    {
        id: 'depenses-abonnements',
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
        footer: 'Définissez fréquence et montants pour anticiper les paiements et éviter les oublis.',
        floats: [
            { label: 'Abonnements', value: '7 actifs', tone: 'info' },
            { label: 'Prochain débit', value: 'Dans 3 j', tone: 'alert' },
            { label: 'Mensuel', value: 'CHF 86', tone: 'info' }
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/domain-subscriptions.png`,
        imageAlt: 'Gestion des abonnements et charges'
    },
    {
        id: 'alertes-notifications',
        kicker: 'Alerter',
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
        floats: [
            { label: 'Budget courses', value: '92 %', tone: 'alert' },
            { label: 'Échéance', value: 'Demain', tone: 'info' },
            { label: 'Objectif', value: 'Atteint', tone: 'success' }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/domain-alerts.png`,
        imageAlt: 'Célébration et notifications positives'
    },
    {
        id: 'calendrier',
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
        footer: 'Les événements récurrents automatisent ce qui se répète : loyer, salaire, abonnements, etc.',
        floats: [
            { label: 'Loyer', value: '1er du mois', tone: 'info' },
            { label: 'Événement', value: 'Partagé', tone: 'success' },
            { label: 'Cashflow', value: 'Positif', tone: 'success' }
        ],
        bgClass: 'bg-surface',
        image: `${FEATURES_IMG}/domain-calendar.png`,
        imageAlt: 'Calendrier et planification financière'
    },
    {
        id: 'securite-devises',
        kicker: 'Protéger',
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
        floats: [
            { label: '2FA', value: 'Activée', tone: 'success' },
            { label: 'Appareils', value: '2 connectés', tone: 'info' },
            { label: 'Devises', value: 'CHF · EUR', tone: 'info' }
        ],
        bgClass: 'bg-lightprimary',
        image: `${FEATURES_IMG}/domain-security.png`,
        imageAlt: 'Sécurité et conformité des données'
    }
];
