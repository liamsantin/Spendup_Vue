import type { notificationType, profileType, searchType } from '@/types/HeaderTypes';

import user1 from '@/assets/images/profile/avatar/user-1.jpg';
import user2 from '@/assets/images/profile/avatar/user-2.jpg';
import user3 from '@/assets/images/profile/avatar/user-3.jpg';

import proUser1 from '@/assets/images/svgs/icon-account.svg';

const notifications: notificationType[] = [
    {
        avatar: user1,
        titleKey: 'header.notifications.items.welcome.title',
        subtitleKey: 'header.notifications.items.welcome.subtitle'
    },
    {
        avatar: user2,
        titleKey: 'header.notifications.items.tip.title',
        subtitleKey: 'header.notifications.items.tip.subtitle'
    },
    {
        avatar: user3,
        titleKey: 'header.notifications.items.reminder.title',
        subtitleKey: 'header.notifications.items.reminder.subtitle'
    }
];

const profileDD: profileType[] = [
    {
        avatar: proUser1,
        titleKey: 'header.profile.menu.preferences.title',
        subtitleKey: 'header.profile.menu.preferences.subtitle',
        href: '/app/comptes'
    }
];

const searchSugg: searchType[] = [
    {
        titleKey: 'header.search.suggestions.dashboard',
        href: '/app'
    },
    {
        titleKey: 'header.search.suggestions.preferences',
        href: '/app/comptes'
    },
    {
        titleKey: 'header.search.suggestions.home',
        href: '/'
    },
    {
        titleKey: 'header.search.suggestions.features',
        href: '/fonctionnalites'
    },
    {
        titleKey: 'header.search.suggestions.about',
        href: '/a-propos'
    }
];

export { notifications, profileDD, searchSugg };
