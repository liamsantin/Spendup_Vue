import { ArticleIcon, CheckboxIcon, ClockIcon, MailIcon, TruckDeliveryIcon } from 'vue-tabler-icons';
import type { NotificationPreference } from '../types';

export const notificationPreferences: NotificationPreference[] = [
    {
        title: 'Notre newsletter',
        subtitle: 'Nous vous informerons toujours des changements importants',
        icon: ArticleIcon,
        switch: false
    },
    {
        title: 'Confirmation de commande',
        subtitle: 'Vous serez notifié lorsqu’un client passe une commande',
        icon: CheckboxIcon,
        switch: true
    },
    {
        title: 'Statut de commande modifié',
        subtitle: 'Vous serez notifié lorsque le client modifie la commande',
        icon: ClockIcon,
        switch: false
    },
    {
        title: 'Commande livrée',
        subtitle: 'Vous serez notifié une fois la commande livrée',
        icon: TruckDeliveryIcon,
        switch: false
    },
    {
        title: 'Notifications par e-mail',
        subtitle: 'Activez les notifications e-mail pour recevoir les mises à jour',
        icon: MailIcon,
        switch: true
    }
];
