export type ProfileVisibility = 'public' | 'friends' | 'private';
export type FriendRequestsFrom = 'everyone' | 'friends_of_friends' | 'friends' | 'nobody';
export type NotificationDigestFrequency = 'off' | 'daily' | 'weekly';
export type DefaultCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';
export type SidebarOption = 'default' | 'compact' | 'mini';
export type ThemeActive = 'light' | 'dark' | 'system';
export type ContainerOption = 'boxed' | 'full';
export type CardStyle = 'shadow' | 'border' | 'flat';
export type Density = 'comfortable' | 'compact';
export type DefaultDashboardView = 'overview' | 'budget' | 'transactions';

/** Contrat PUT/GET `/api/settings` — 30 champs, remplacement total. */
export type UserSettings = {
    profileVisibility: ProfileVisibility;
    discoverableInSearch: boolean;
    friendRequestsFrom: FriendRequestsFrom;
    profilePictureVisibility: ProfileVisibility;
    emailSecurityAlerts: boolean;
    emailFriendRequest: boolean;
    emailFinancialAlerts: boolean;
    pushNotifications: boolean;
    pushSecurityAlerts: boolean;
    pushFriendRequest: boolean;
    pushFinancialAlerts: boolean;
    notificationDigestFrequency: NotificationDigestFrequency;
    idleLogoutMinutes: number | null;
    require2faForSensitiveActions: boolean;
    trustedDeviceDurationDays: number;
    locale: string;
    timezone: string;
    defaultCurrency: DefaultCurrency;
    firstDayOfWeek: number;
    sidebarLayout: SidebarOption;
    sidebarType: SidebarOption;
    themeColor: string;
    themeDarkColor: string;
    themeActive: ThemeActive;
    containerOption: ContainerOption;
    cardStyle: CardStyle;
    density: Density;
    defaultDashboardView: DefaultDashboardView;
    showBalanceOnDashboard: boolean;
    hideSensitiveAmounts: boolean;
};

export const USER_SETTINGS_DEFAULTS: UserSettings = {
    profileVisibility: 'friends',
    discoverableInSearch: true,
    friendRequestsFrom: 'everyone',
    profilePictureVisibility: 'friends',
    emailSecurityAlerts: true,
    emailFriendRequest: true,
    emailFinancialAlerts: true,
    pushNotifications: true,
    pushSecurityAlerts: true,
    pushFriendRequest: true,
    pushFinancialAlerts: true,
    notificationDigestFrequency: 'daily',
    idleLogoutMinutes: null,
    require2faForSensitiveActions: false,
    trustedDeviceDurationDays: 30,
    locale: 'fr-CH',
    timezone: 'Europe/Zurich',
    defaultCurrency: 'CHF',
    firstDayOfWeek: 1,
    sidebarLayout: 'default',
    sidebarType: 'default',
    themeColor: '#0f3d2e',
    themeDarkColor: '#0a2a1f',
    themeActive: 'light',
    containerOption: 'boxed',
    cardStyle: 'shadow',
    density: 'comfortable',
    defaultDashboardView: 'overview',
    showBalanceOnDashboard: true,
    hideSensitiveAmounts: false
};

export const LOCALE_OPTIONS = [
    { value: 'fr-CH', labelKey: 'userSettings.regional.locales.frCH' },
    { value: 'en-US', labelKey: 'userSettings.regional.locales.enUS' }
] as const;

export const TIMEZONE_OPTIONS: string[] = [
    'Europe/Zurich',
    'Europe/Paris',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'UTC'
];

export const CURRENCY_OPTIONS: DefaultCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];
