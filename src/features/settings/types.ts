import type { TablerIconComponent } from 'vue-tabler-icons';

export type NotificationPreference = {
    title: string;
    subtitle: string;
    icon: TablerIconComponent;
    switch: boolean;
};
