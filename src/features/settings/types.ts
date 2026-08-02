import type { TablerIconComponent } from 'vue-tabler-icons';

export type NotificationPreference = {
    titleKey: string;
    subtitleKey: string;
    icon: TablerIconComponent;
    switch: boolean;
};
