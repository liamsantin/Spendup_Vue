import type { notificationType, profileType, appsLinkType, quickLinksType, searchType } from '@/types/HeaderTypes';

import user1 from '@/assets/images/profile/user-1.jpg';
import user2 from '@/assets/images/profile/user-2.jpg';
import user3 from '@/assets/images/profile/user-3.jpg';
import user4 from '@/assets/images/profile/user-4.jpg';
import user5 from '@/assets/images/profile/user-5.jpg';

const notifications: notificationType[] = [
    {
        avatar: user1,
        title: 'Roman Joined the Team!',
        subtitle: 'Congratulate him'
    },
    {
        avatar: user2,
        title: 'New message received',
        subtitle: 'Salma sent you new message'
    },
    {
        avatar: user3,
        title: 'New Payment received',
        subtitle: 'Check your earnings'
    },
    {
        avatar: user4,
        title: 'Jolly completed tasks',
        subtitle: 'Assign her new tasks'
    },
    {
        avatar: user5,
        title: 'New Payment received',
        subtitle: 'Check your earnings'
    },
    {
        avatar: user1,
        title: 'Roman Joined the Team!',
        subtitle: 'Congratulate him'
    }
];

import proUser1 from '@/assets/images/svgs/icon-account.svg';
import proUser2 from '@/assets/images/svgs/icon-inbox.svg';
import proUser3 from '@/assets/images/svgs/icon-tasks.svg';

const profileDD: profileType[] = [
    {
        avatar: proUser1,
        title: 'Tableau de bord',
        subtitle: 'Spend.Up',
        href: '/app'
    },
    {
        avatar: proUser2,
        title: 'Réglages du compte',
        subtitle: 'Profil et préférences',
        href: '/app/account-settings'
    },
    {
        avatar: proUser3,
        title: 'Site public',
        subtitle: 'Accueil',
        href: '/'
    }
];

import img1 from '@/assets/images/svgs/icon-dd-chat.svg';
import img6 from '@/assets/images/svgs/icon-dd-lifebuoy.svg';
import img8 from '@/assets/images/svgs/icon-dd-application.svg';

const appsLink: appsLinkType[] = [
    {
        avatar: img8,
        title: 'Tableau de bord',
        subtext: 'Vue d’ensemble',
        href: '/app'
    },
    {
        avatar: img6,
        title: 'Réglages du compte',
        subtext: 'Profil utilisateur',
        href: '/app/account-settings'
    },
    {
        avatar: img1,
        title: 'Site public',
        subtext: 'Pages marketing',
        href: '/'
    }
];

const quickLink: quickLinksType[] = [
    {
        title: 'Tableau de bord',
        href: '/app'
    },
    {
        title: 'Réglages du compte',
        href: '/app/account-settings'
    },
    {
        title: 'Connexion',
        href: '/auth/login'
    },
    {
        title: 'Accueil public',
        href: '/'
    },
    {
        title: 'Fonctionnalités',
        href: '/fonctionnalites'
    }
];

const searchSugg: searchType[] = [
    {
        title: 'Tableau de bord',
        href: '/app'
    },
    {
        title: 'Réglages du compte',
        href: '/app/account-settings'
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

export { notifications, profileDD, appsLink, quickLink, searchSugg };
