import type { appsLinkType, profileType, quickLinksType, searchType } from '@/types/HeaderTypes';

import proUser1 from '@/assets/images/svgs/icon-account.svg';
import proFriends from '@/assets/images/svgs/icon-friends.svg';
import img1 from '@/assets/images/svgs/icon-dd-chat.svg';
import img2 from '@/assets/images/svgs/icon-dd-cart.svg';
import img3 from '@/assets/images/svgs/icon-dd-invoice.svg';
import img4 from '@/assets/images/svgs/icon-dd-date.svg';
import img5 from '@/assets/images/svgs/icon-dd-mobile.svg';
import img6 from '@/assets/images/svgs/icon-dd-lifebuoy.svg';
import img7 from '@/assets/images/svgs/icon-dd-message-box.svg';
import img8 from '@/assets/images/svgs/icon-dd-application.svg';

const profileDD: profileType[] = [
    {
        avatar: proUser1,
        titleKey: 'header.profile.menu.preferences.title',
        subtitleKey: 'header.profile.menu.preferences.subtitle',
        href: '/app/comptes'
    },
    {
        avatar: proFriends,
        titleKey: 'header.profile.menu.friends.title',
        subtitleKey: 'header.profile.menu.friends.subtitle',
        href: '/app/friends'
    }
];

const searchSugg: searchType[] = [
    {
        titleKey: 'header.search.suggestions.dashboard.title',
        subtitleKey: 'header.search.suggestions.dashboard.subtitle',
        href: '/app',
        icon: 'dashboard',
        group: 'app'
    },
    {
        titleKey: 'header.search.suggestions.notifications.title',
        subtitleKey: 'header.search.suggestions.notifications.subtitle',
        href: '/app/notifications',
        icon: 'notifications',
        group: 'app'
    },
    {
        titleKey: 'header.search.suggestions.friends.title',
        subtitleKey: 'header.search.suggestions.friends.subtitle',
        href: '/app/friends',
        icon: 'friends',
        group: 'app'
    },
    {
        titleKey: 'header.search.suggestions.preferences.title',
        subtitleKey: 'header.search.suggestions.preferences.subtitle',
        href: '/app/comptes',
        icon: 'account',
        group: 'app'
    },
    {
        titleKey: 'header.search.suggestions.home.title',
        subtitleKey: 'header.search.suggestions.home.subtitle',
        href: '/',
        icon: 'home',
        group: 'site'
    },
    {
        titleKey: 'header.search.suggestions.features.title',
        subtitleKey: 'header.search.suggestions.features.subtitle',
        href: '/fonctionnalites',
        icon: 'features',
        group: 'site'
    },
    {
        titleKey: 'header.search.suggestions.about.title',
        subtitleKey: 'header.search.suggestions.about.subtitle',
        href: '/a-propos',
        icon: 'about',
        group: 'site'
    }
];

/** Contenu temporaire (template Modernize) — à adapter ensuite. */
const appsLink: appsLinkType[] = [
    {
        avatar: img1,
        titleKey: 'header.appsSidebar.apps.chat.title',
        subtitleKey: 'header.appsSidebar.apps.chat.subtitle',
        href: '/apps/chats'
    },
    {
        avatar: img2,
        titleKey: 'header.appsSidebar.apps.ecommerce.title',
        subtitleKey: 'header.appsSidebar.apps.ecommerce.subtitle',
        href: '/ecommerce/products'
    },
    {
        avatar: img3,
        titleKey: 'header.appsSidebar.apps.profile.title',
        subtitleKey: 'header.appsSidebar.apps.profile.subtitle',
        href: '/apps/user/profile'
    },
    {
        avatar: img4,
        titleKey: 'header.appsSidebar.apps.calendar.title',
        subtitleKey: 'header.appsSidebar.apps.calendar.subtitle',
        href: '/apps/calendar'
    },
    {
        avatar: img5,
        titleKey: 'header.appsSidebar.apps.contacts.title',
        subtitleKey: 'header.appsSidebar.apps.contacts.subtitle',
        href: '/apps/contacts'
    },
    {
        avatar: img6,
        titleKey: 'header.appsSidebar.apps.settings.title',
        subtitleKey: 'header.appsSidebar.apps.settings.subtitle',
        href: '/pages/account-settings'
    },
    {
        avatar: img7,
        titleKey: 'header.appsSidebar.apps.email.title',
        subtitleKey: 'header.appsSidebar.apps.email.subtitle',
        href: '/'
    },
    {
        avatar: img8,
        titleKey: 'header.appsSidebar.apps.notes.title',
        subtitleKey: 'header.appsSidebar.apps.notes.subtitle',
        href: '/apps/notes'
    }
];

const quickLink: quickLinksType[] = [
    {
        titleKey: 'header.appsSidebar.quickLinks.dashboard',
        href: '/app'
    },
    {
        titleKey: 'header.appsSidebar.quickLinks.notifications',
        href: '/app/notifications'
    },
    {
        titleKey: 'header.appsSidebar.quickLinks.friends',
        href: '/app/friends'
    },
    {
        titleKey: 'header.appsSidebar.quickLinks.preferences',
        href: '/app/comptes'
    }
];

export { profileDD, searchSugg, appsLink, quickLink };
