import type { profileType, searchType } from '@/types/HeaderTypes';

import proUser1 from '@/assets/images/svgs/icon-account.svg';

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
        titleKey: 'header.search.suggestions.friends',
        href: '/app/friends'
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

export { profileDD, searchSugg };
