import type { notificationType, profileType, searchType } from '@/types/HeaderTypes';

import user1 from '@/assets/images/profile/avatar/user-1.jpg';
import user2 from '@/assets/images/profile/avatar/user-2.jpg';
import user3 from '@/assets/images/profile/avatar/user-3.jpg';

import proUser1 from '@/assets/images/svgs/icon-account.svg';

const notifications: notificationType[] = [
    {
        avatar: user1,
        title: 'Bienvenue sur Spend.Up',
        subtitle: 'Votre espace est prêt'
    },
    {
        avatar: user2,
        title: 'Conseil du jour',
        subtitle: 'Suivez vos dépenses chaque semaine'
    },
    {
        avatar: user3,
        title: 'Rappel',
        subtitle: 'Pensez à vérifier vos comptes'
    }
];

const profileDD: profileType[] = [
    {
        avatar: proUser1,
        title: 'Comptes',
        subtitle: 'Compte & sécurité',
        href: '/app/comptes'
    }
];

const searchSugg: searchType[] = [
    {
        title: 'Tableau de bord',
        href: '/app'
    },
    {
        title: 'Comptes',
        href: '/app/comptes'
    },
    {
        title: 'Applications',
        href: '/app/applications'
    },
    {
        title: 'Accueil',
        href: '/'
    },
    {
        title: 'Fonctionnalités',
        href: '/fonctionnalites'
    },
    {
        title: 'À propos',
        href: '/a-propos'
    }
];

export { notifications, profileDD, searchSugg };
