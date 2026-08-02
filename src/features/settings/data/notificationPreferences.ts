import { ArticleIcon, CheckboxIcon, ClockIcon, MailIcon, TruckDeliveryIcon } from 'vue-tabler-icons';
import type { NotificationPreference } from '../types';

export const notificationPreferences: NotificationPreference[] = [
    {
        titleKey: 'notifications.preferences.items.newsletter.title',
        subtitleKey: 'notifications.preferences.items.newsletter.subtitle',
        icon: ArticleIcon,
        switch: false
    },
    {
        titleKey: 'notifications.preferences.items.orderConfirmation.title',
        subtitleKey: 'notifications.preferences.items.orderConfirmation.subtitle',
        icon: CheckboxIcon,
        switch: true
    },
    {
        titleKey: 'notifications.preferences.items.orderStatusChanged.title',
        subtitleKey: 'notifications.preferences.items.orderStatusChanged.subtitle',
        icon: ClockIcon,
        switch: false
    },
    {
        titleKey: 'notifications.preferences.items.orderDelivered.title',
        subtitleKey: 'notifications.preferences.items.orderDelivered.subtitle',
        icon: TruckDeliveryIcon,
        switch: false
    },
    {
        titleKey: 'notifications.preferences.items.emailNotifications.title',
        subtitleKey: 'notifications.preferences.items.emailNotifications.subtitle',
        icon: MailIcon,
        switch: true
    }
];
