import type { FooterType, PackageType } from '@/types/components/front-pages';

export const SpendupPricingPackages: PackageType[] = [
    {
        tagtext: false,
        caption: 'Offre Gratuite',
        subtext: 'Commencez sans engagement — parfait pour découvrir la plateforme.',
        price: 0,
        period: 'mois',
        buttontext: 'Créer un compte',
        url: '/auth/register',
        list: [
            { listtitle: 'Gestion des revenus', status: false, icon: true, disable: false },
            { listtitle: 'Gestion des dépenses', status: false, icon: true, disable: false },
            { listtitle: 'Catégories personnalisées', status: false, icon: true, disable: false },
            { listtitle: 'Tableau de bord financier', status: false, icon: true, disable: false },
            { listtitle: 'Statistiques de base', status: false, icon: true, disable: false },
            { listtitle: 'Gestion du profil utilisateur', status: false, icon: true, disable: false },
            { listtitle: 'Authentification sécurisée', status: false, icon: true, disable: false },
            { listtitle: 'Accès multi-appareils', status: false, icon: true, disable: false }
        ]
    },
    {
        tagtext: true,
        tagLabel: 'Bientôt',
        caption: 'Offre Premium',
        subtext: 'Pour aller plus loin dans la gestion financière.',
        price: 9.9,
        period: 'mois',
        buttontext: 'Être informé',
        url: '/auth/register',
        buttonOutlined: true,
        list: [
            { listtitle: "Toutes les fonctionnalités de l'offre Gratuite", status: false, icon: true, disable: false },
            { listtitle: 'Budgets avancés', status: false, icon: true, disable: false },
            { listtitle: 'Objectifs financiers illimités', status: false, icon: true, disable: false },
            { listtitle: 'Statistiques détaillées', status: false, icon: true, disable: false },
            { listtitle: 'Rapports financiers avancés', status: false, icon: true, disable: false },
            { listtitle: 'Historique étendu', status: false, icon: true, disable: false },
            { listtitle: 'Fonctionnalités exclusives à venir', status: false, icon: true, disable: false },
            { listtitle: 'Assistance prioritaire', status: false, icon: true, disable: false }
        ]
    }
];

export const FooterMenu1: FooterType[] = [
    { menu: 'Accueil', link: '/' },
    { menu: 'Fonctionnalités', link: '/fonctionnalites' },
    { menu: 'À propos', link: '/a-propos' },
    { menu: 'Connexion', link: '/auth/login' },
    { menu: 'Créer un compte', link: '/auth/register' }
];

export const FooterMenu2: FooterType[] = [
    { menu: 'Tarifs', link: '/tarifs' },
    { menu: "Conditions d'utilisation", link: '/conditions-utilisation' },
    { menu: 'Politique de confidentialité', link: '/politique-confidentialite' },
    { menu: 'Application', link: '/app' }
];

export const FooterMenu3: FooterType[] = [
    { menu: 'Accueil public', link: '/' },
    { menu: 'À propos', link: '/a-propos' }
];
