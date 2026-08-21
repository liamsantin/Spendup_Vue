<script setup lang="ts">
/**
 * Showcase composants (dev only).
 * Onglet Alert = clone `_template/modernize/components/ui-components/alert/*`.
 * Onglet Chip = clone `_template/modernize/components/ui-components/chip/*` via AppChip.
 * Onglet Switch = clone Modernize switch via AppSwitch.
 * Onglet Radio = wrapper radio base via AppRadioButton.
 * Onglet Modal = AppModalBase / AppConfirmationModal / AppModalTabs.
 */
defineOptions({ name: 'ComponentsShowcasePage' });

import { computed, ref } from 'vue';
import {
    BluetoothIcon,
    ChecksIcon,
    CircleXIcon,
    CreditCardIcon,
    HeartIcon,
    KeyIcon,
    MoodSmileIcon,
    PhoneIcon,
    PhotoIcon,
    StarIcon,
    UserIcon,
    UserCircleIcon,
    UserPlusIcon,
    UsersIcon,
    WifiIcon
} from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppBaseTabs from '@/components/shared/tabs/AppBaseTabs.vue';
import AppChip from '@/components/shared/chip/AppChip.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import AppRadioButton from '@/components/shared/radio/AppRadioButton.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import blogImg1 from '@/assets/images/ui/tabs/blog/blog-img1.jpg';
import blogImg2 from '@/assets/images/ui/tabs/blog/blog-img2.jpg';
import blogImg3 from '@/assets/images/ui/tabs/blog/blog-img3.jpg';
import blogImg4 from '@/assets/images/ui/tabs/blog/blog-img4.jpg';
import blogImg5 from '@/assets/images/ui/tabs/blog/blog-img5.jpg';
import productImg3 from '@/assets/images/ui/tabs/products/s3.jpg';
import productImg4 from '@/assets/images/ui/tabs/products/s4.jpg';
import productImg5 from '@/assets/images/ui/tabs/products/s5.jpg';
import productImg6 from '@/assets/images/ui/tabs/products/s6.jpg';
import productImg7 from '@/assets/images/ui/tabs/products/s7.jpg';
import productImg8 from '@/assets/images/ui/tabs/products/s8.jpg';
import productImg9 from '@/assets/images/ui/tabs/products/s9.jpg';
import productImg10 from '@/assets/images/ui/tabs/products/s10.jpg';
import productImg11 from '@/assets/images/ui/tabs/products/s11.jpg';
import productImg12 from '@/assets/images/ui/tabs/products/s12.jpg';
import user1 from '@/assets/images/profile/avatar/user-1.jpg';
import user2 from '@/assets/images/profile/avatar/user-2.jpg';
import user5 from '@/assets/images/profile/avatar/user-5.jpg';

const tab = ref('alert');
const closableOpen = ref(true);
const tabsBasic = ref('one');
const tabsBasicPilled = ref('one');
const tabsStacked = ref('recents');
const tabsStackedPilled = ref('recents');
const tabsAlignCenter = ref('landscape');
const tabsAlignCenterPilled = ref('landscape');
const tabsAlignEnd = ref('landscape');
const tabsAlignEndPilled = ref('landscape');
const tabsIcon = ref('phone');
const tabsIconPilled = ref('phone');
const tabsDisabled = ref('one');
const tabsDisabledPilled = ref('one');
const tabsColors = ref('one');
const tabsColorsPilled = ref('one');
const tabsCenterActivePilled = ref('item-1');
const tabsCustomIconsPilled = ref('custom-1');

const modalScrollableOpen = ref(false);
const modalStaticOpen = ref(false);
const confirmationOpen = ref(false);
const modalTabsOpen = ref(false);
const modalTabsTab = ref('one');

const switchDefaultOn = ref(true);
const switchDefaultOff = ref(false);
const switchInsetOn = ref(true);
const switchInsetOff = ref(false);
const switchLabelOn = ref(true);
const switchLabelOff = ref(false);
const switchWifi = ref(true);
const switchBluetooth = ref(false);
const switchColors = ['primary', 'secondary', 'success', 'error', 'warning'] as const;
const radioInline = ref('viewer');
const radioStacked = ref('editor');
const radioColors = ['primary', 'secondary', 'success', 'error', 'warning'] as const;
const radioItems = [
    { title: 'Viewer', value: 'viewer' },
    { title: 'Editor', value: 'editor' }
];
const basicTabItems = [
    { value: 'one', label: 'Item One' },
    { value: 'two', label: 'Item Two' },
    { value: 'three', label: 'Item Three' }
];
const stackedTabItems = [
    { value: 'recents', label: 'Recents', icon: PhoneIcon },
    { value: 'favorites', label: 'Favorites', icon: HeartIcon },
    { value: 'nearby', label: 'Nearby', icon: UserIcon }
];
const centerActiveItems = Array.from({ length: 14 }, (_, index) => ({
    value: `item-${index + 1}`,
    label: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen'][index]
}));
const alignTabsItems = [
    { value: 'landscape', label: 'Landscape' },
    { value: 'products', label: 'Products' },
    { value: 'abstract', label: 'Abstract' }
];
const iconTabItems = [
    { value: 'phone', icon: PhoneIcon },
    { value: 'heart', icon: HeartIcon },
    { value: 'user', icon: UserIcon }
];
const disabledTabItems = [
    { value: 'one', label: 'Item One', icon: PhoneIcon },
    { value: 'two', label: 'Item Two', icon: HeartIcon, disabled: true },
    { value: 'three', label: 'Item Three', icon: UserIcon }
];
const colorTabItems = [
    { value: 'one', label: 'Item One', icon: PhoneIcon, color: 'secondary' },
    { value: 'two', label: 'Item Two', icon: HeartIcon, color: 'warning' },
    { value: 'three', label: 'Item Three', icon: UserIcon, color: 'primary' }
];
const customIconsItems = Array.from({ length: 30 }, (_, index) => ({
    value: `custom-${index + 1}`,
    label: `Item ${index + 1}`
}));
const galleryLandscape = [{ img: blogImg1 }, { img: blogImg2 }, { img: blogImg3 }, { img: blogImg4 }, { img: blogImg5 }, { img: blogImg1 }];
const galleryProducts = [{ img: productImg3 }, { img: productImg4 }, { img: productImg5 }, { img: productImg6 }, { img: productImg7 }, { img: productImg8 }];
const galleryAbstract = [{ img: productImg9 }, { img: productImg10 }, { img: productImg11 }, { img: productImg7 }, { img: productImg12 }, { img: productImg8 }];

const chipClosable = ref({
    primary: true,
    secondary: true,
    warning: true,
    success: true,
    error: true,
    info: true
});

const anyChipClosableHidden = computed(() => Object.values(chipClosable.value).some((v) => !v));

function resetChipClosable() {
    chipClosable.value = {
        primary: true,
        secondary: true,
        warning: true,
        success: true,
        error: true,
        info: true
    };
}
</script>

<template>
    <div class="pa-6 pa-md-10 mx-auto" style="max-width: 880px">
        <h1 class="text-h4 font-weight-bold textPrimary mb-2">Présentation des composants</h1>
        <p class="text-subtitle-1 text-medium-emphasis mb-6">
            Page interne développement uniquement (<code>VITE_APP_ENV=development</code>). Accès par URL
            <code>/components</code> — aucun lien dans l’app.
        </p>

        <v-tabs v-model="tab" color="primary" class="mb-4">
            <v-tab value="alert">Alert</v-tab>
            <v-tab value="chip">Chip</v-tab>
            <v-tab value="switch">Switch</v-tab>
            <v-tab value="radio">Radio</v-tab>
            <v-tab value="modal">Modal</v-tab>
            <v-tab value="tabs">Tabs</v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
            <v-tabs-window-item value="alert">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppAlert</code> — clone Modernize
                    <code>_template/modernize/components/ui-components/alert/</code>
                </p>

                <!-- Basic.vue → tonal + color (pas de density = default) -->
                <h3 class="text-h6 font-weight-semibold mb-3">Basic (tonal)</h3>
                <div class="mb-8">
                    <AppAlert class="mb-3" color="error" variant="tonal" density="default">This is an error alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" color="warning" variant="tonal" density="default"
                        >This is a warning alert — check it out!</AppAlert
                    >
                    <AppAlert class="mb-3" color="info" variant="tonal" density="default">This is an info alert — check it out!</AppAlert>
                    <AppAlert color="success" variant="tonal" density="default">This is a success alert — check it out!</AppAlert>
                </div>

                <!-- Filled.vue → type uniquement -->
                <h3 class="text-h6 font-weight-semibold mb-3">Filled</h3>
                <div class="mb-8">
                    <AppAlert class="mb-3" type="error" density="default">This is an error alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" type="warning" density="default">This is a warning alert — check it out!</AppAlert>
                    <AppAlert class="mb-3" type="info" density="default">This is an info alert — check it out!</AppAlert>
                    <AppAlert type="success" density="default">This is a success alert — check it out!</AppAlert>
                </div>

                <!-- Outlined.vue → outlined + compact + prepend icons -->
                <h3 class="text-h6 font-weight-semibold mb-3">Outlined</h3>
                <div class="mb-8">
                    <AppAlert type="error" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$error" />
                        </template>
                        <div>This is an error alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="warning" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$warning" />
                        </template>
                        <div>This is a warning alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="info" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$error" />
                        </template>
                        <div>This is an info alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="success" variant="outlined" density="compact" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$success" />
                        </template>
                        <div>This is a success alert — check it out!</div>
                    </AppAlert>
                </div>

                <!-- Description.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Description</h3>
                <div class="mb-8">
                    <AppAlert type="error" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">error</h5>
                        <div>This is an error alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="warning" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">warning</h5>
                        <div>This is an warning alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="info" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">info</h5>
                        <div>This is an info alert — check it out!</div>
                    </AppAlert>
                    <AppAlert type="success" variant="tonal" density="default" class="mb-4">
                        <h5 class="text-h6 text-capitalize">success</h5>
                        <div>This is an success alert — check it out!</div>
                    </AppAlert>
                </div>

                <!-- Icons.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Icons</h3>
                <div class="mb-8">
                    <AppAlert color="success" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$success" />
                        </template>
                        <div>This is an success alert.</div>
                    </AppAlert>
                    <AppAlert color="info" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$error" />
                        </template>
                        <div>This is an info alert.</div>
                    </AppAlert>
                    <AppAlert color="warning" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$warning" />
                        </template>
                        <div>This is an warning alert.</div>
                    </AppAlert>
                    <AppAlert color="error" variant="tonal" density="default" class="mb-4">
                        <template #prepend>
                            <v-icon class="text-24" icon="$error" />
                        </template>
                        <div>This is an error alert.</div>
                    </AppAlert>
                </div>

                <!-- Closable.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Closable</h3>
                <div class="mb-8">
                    <AppAlert
                        v-model="closableOpen"
                        border="start"
                        variant="tonal"
                        density="default"
                        closable
                        close-label="Close Alert"
                        color="primary"
                        title="Closable Alert"
                    >
                        Aenean imperdiet. Quisque id odio. Cras dapibus. Pellentesque ut neque. Cras dapibus. Vivamus consectetuer hendrerit
                        lacus. Sed mollis, eros et ultrices tempus, mauris ipsum aliquam libero, non
                    </AppAlert>
                    <div v-if="!closableOpen" class="mt-3">
                        <v-btn color="primary" flat @click="closableOpen = true">Reset</v-btn>
                    </div>
                </div>

                <!-- Action.vue → compact + single-line-alert -->
                <h3 class="text-h6 font-weight-semibold mb-3">Action</h3>
                <div class="mb-8">
                    <AppAlert type="warning" density="compact" class="mb-4 single-line-alert" closable>
                        <div>This is an warning alert — check it out!</div>
                        <template #prepend>
                            <v-icon class="text-24" icon="$warning" />
                        </template>
                    </AppAlert>
                    <AppAlert type="info" density="compact" class="mb-4 single-line-alert" closable>
                        <div>This is an info alert — check it out!</div>
                        <template #prepend>
                            <v-icon class="text-24" icon="$error" />
                        </template>
                    </AppAlert>
                </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="chip">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppChip</code> — clone Modernize
                    <code>_template/modernize/components/ui-components/chip/</code>
                </p>

                <!-- FilledColor.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Filled</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-3">
                    <AppChip class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Default Filled
                    </AppChip>
                    <AppChip class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Default Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="primary" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user1" width="25" alt="" />
                        </v-avatar>
                        Primary Filled
                    </AppChip>
                    <AppChip color="primary" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user1" width="25" alt="" />
                        </v-avatar>
                        Primary Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="secondary" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Secondary Filled
                    </AppChip>
                    <AppChip color="secondary" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Secondary Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="success" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user2" width="25" alt="" />
                        </v-avatar>
                        Success Filled
                    </AppChip>
                    <AppChip color="success" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user2" width="25" alt="" />
                        </v-avatar>
                        Success Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="warning" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Warning Filled
                    </AppChip>
                    <AppChip color="warning" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Warning Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="error" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user5" width="25" alt="" />
                        </v-avatar>
                        Error Filled
                    </AppChip>
                    <AppChip color="error" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user5" width="25" alt="" />
                        </v-avatar>
                        Error Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                </div>

                <!-- Outlined.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Outlined</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-3">
                    <AppChip variant="outlined" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Default Outlined
                    </AppChip>
                    <AppChip variant="outlined" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Default Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip variant="outlined" color="primary" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user1" width="25" alt="" />
                        </v-avatar>
                        Primary Outlined
                    </AppChip>
                    <AppChip variant="outlined" color="primary" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user1" width="25" alt="" />
                        </v-avatar>
                        Primary Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip variant="outlined" color="secondary" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Secondary Outlined
                    </AppChip>
                    <AppChip variant="outlined" color="secondary" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Secondary Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip variant="outlined" color="success" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user2" width="25" alt="" />
                        </v-avatar>
                        Success Outlined
                    </AppChip>
                    <AppChip variant="outlined" color="success" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user2" width="25" alt="" />
                        </v-avatar>
                        Success Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip variant="outlined" color="warning" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Warning Outlined
                    </AppChip>
                    <AppChip variant="outlined" color="warning" class="text-body-2">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Warning Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip variant="outlined" color="error" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user5" width="25" alt="" />
                        </v-avatar>
                        Error Outlined
                    </AppChip>
                    <AppChip variant="outlined" color="error" class="text-body-2">
                        <v-avatar start size="25">
                            <img :src="user5" width="25" alt="" />
                        </v-avatar>
                        Error Deletable
                        <CircleXIcon class="ml-2" start size="20" />
                    </AppChip>
                </div>

                <!-- CustomIcon.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Custom Icon</h3>
                <div class="mb-8 d-flex flex-column flex-sm-row flex-wrap align-center ga-3">
                    <AppChip color="primary">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="secondary">
                        <UserCircleIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                </div>

                <!-- CustomIconOutlined.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Custom Outlined Icon</h3>
                <div class="mb-8 d-flex flex-column flex-sm-row flex-wrap align-center ga-3">
                    <AppChip color="primary" variant="outlined">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="secondary" variant="outlined">
                        <UserCircleIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                </div>

                <!-- Disabled.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Disabled</h3>
                <div class="mb-8 d-flex flex-column flex-sm-row flex-wrap align-center ga-3">
                    <AppChip disabled variant="outlined">
                        <MoodSmileIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                    <AppChip color="secondary" disabled variant="outlined">
                        <UserCircleIcon class="mr-2" start size="20" />
                        Custom Icon
                        <ChecksIcon class="ml-2" start size="20" />
                    </AppChip>
                </div>

                <!-- Sizes.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Sizes</h3>
                <div class="mb-8 d-flex flex-column flex-sm-row flex-wrap align-center ga-3">
                    <AppChip color="primary" size="x-small">x-small</AppChip>
                    <AppChip color="primary" size="small">small</AppChip>
                    <AppChip color="primary">Default</AppChip>
                    <AppChip color="primary" size="large">large</AppChip>
                    <AppChip color="primary" size="x-large">x-large</AppChip>
                </div>

                <!-- Closable.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Closable</h3>
                <div class="mb-8">
                    <div class="d-flex flex-wrap align-center ga-3">
                        <AppChip v-model:visible="chipClosable.primary" closable color="primary">Primary Deletable</AppChip>
                        <AppChip v-model:visible="chipClosable.secondary" closable color="secondary">Secondary Deletable</AppChip>
                        <AppChip v-model:visible="chipClosable.warning" closable color="warning">Warning Deletable</AppChip>
                        <AppChip v-model:visible="chipClosable.success" closable color="success">Success Deletable</AppChip>
                        <AppChip v-model:visible="chipClosable.error" closable color="error">Error Deletable</AppChip>
                        <AppChip v-model:visible="chipClosable.info" closable color="info">Info Deletable</AppChip>
                    </div>
                    <div v-if="anyChipClosableHidden" class="mt-3">
                        <v-btn color="primary" flat @click="resetChipClosable">Reset</v-btn>
                    </div>
                </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="switch">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppSwitch</code> — clone Modernize
                    <code>_template/modernize/components/forms/form-elements/switch/</code>
                    et
                    <code>_template/modernize/components/ui-components/list/SwitchList.vue</code>
                </p>

                <!-- Default.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Default</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-4">
                    <AppSwitch v-model="switchDefaultOn" :inset="false" />
                    <AppSwitch v-model="switchDefaultOff" :inset="false" />
                    <AppSwitch :model-value="true" :inset="false" disabled />
                    <AppSwitch :model-value="false" :inset="false" disabled />
                </div>

                <!-- Inset.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Inset</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-4">
                    <AppSwitch v-model="switchInsetOn" />
                    <AppSwitch v-model="switchInsetOff" />
                    <AppSwitch :model-value="true" disabled />
                    <AppSwitch :model-value="false" disabled />
                </div>

                <!-- Colors.vue / InsetColors.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Colors</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-4">
                    <AppSwitch v-for="color in switchColors" :key="`default-${color}`" :model-value="true" :color="color" :inset="false" />
                </div>
                <h3 class="text-h6 font-weight-semibold mb-3">Inset Colors</h3>
                <div class="mb-8 d-flex flex-wrap align-center ga-4">
                    <AppSwitch v-for="color in switchColors" :key="`inset-${color}`" :model-value="true" :color="color" />
                </div>

                <!-- Label.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">Label</h3>
                <div class="mb-8">
                    <AppSwitch v-model="switchLabelOn" label="Label" :inset="false" />
                    <AppSwitch v-model="switchLabelOff" label="Disabled" :inset="false" disabled />
                </div>

                <!-- States.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">States (loading)</h3>
                <div class="mb-8">
                    <AppSwitch :model-value="true" loading="warning" label="on loading" :inset="false" />
                    <AppSwitch :model-value="false" loading="warning" label="off loading" :inset="false" />
                </div>

                <!-- SwitchList.vue -->
                <h3 class="text-h6 font-weight-semibold mb-3">List</h3>
                <div class="mb-8">
                    <v-list>
                        <v-card variant="outlined" class="py-2">
                            <v-list-item value="wifi" class="mb-2" color="primary">
                                <div class="d-flex align-center">
                                    <WifiIcon size="22" stroke-width="1.5" class="mr-2" />
                                    <div class="ml-3">Wi-Fi</div>
                                    <div class="ml-auto">
                                        <AppSwitch v-model="switchWifi" />
                                    </div>
                                </div>
                            </v-list-item>
                            <v-list-item value="bluetooth" class="mb-2" color="primary">
                                <div class="d-flex align-center">
                                    <BluetoothIcon size="22" stroke-width="1.5" class="mr-2" />
                                    <div class="ml-3">Bluetooth</div>
                                    <div class="ml-auto">
                                        <AppSwitch v-model="switchBluetooth" />
                                    </div>
                                </div>
                            </v-list-item>
                        </v-card>
                    </v-list>
                </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="radio">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppRadioButton</code> — wrapper Spend.Up inspiré de
                    <code>_template/modernize/views/forms/form-elements/VRadio.vue</code>
                </p>

                <h3 class="text-h6 font-weight-semibold mb-3">Inline</h3>
                <div class="mb-8">
                    <AppRadioButton v-model="radioInline" :items="radioItems" inline hide-details="auto" />
                </div>

                <h3 class="text-h6 font-weight-semibold mb-3">Stacked</h3>
                <div class="mb-8">
                    <AppRadioButton v-model="radioStacked" :items="radioItems" hide-details="auto" />
                </div>

                <h3 class="text-h6 font-weight-semibold mb-3">Colors</h3>
                <div class="mb-8 d-flex flex-column ga-2">
                    <AppRadioButton
                        v-for="color in radioColors"
                        :key="color"
                        :model-value="'viewer'"
                        :items="radioItems"
                        :color="color"
                        inline
                        hide-details="auto"
                    />
                </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="modal">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppModalBase</code> — shell modal Spend.Up. Doc :
                    <code>docs/components/modal-base.md</code>
                </p>

                <h3 class="text-h6 font-weight-semibold mb-3">Scrollable (contenu long)</h3>
                <div class="mb-8">
                    <p class="text-body-2 text-medium-emphasis mb-3">
                        Header + footer fixes, body avec <code>perfect-scrollbar</code> (<code>scrollable</code> par défaut).
                    </p>
                    <v-btn color="primary" flat @click="modalScrollableOpen = true">Ouvrir modal scrollable</v-btn>

                    <AppModalBase
                        v-model="modalScrollableOpen"
                        title="Exemple scrollable"
                        subtitle="Le header et le footer restent fixes pendant le scroll."
                        :max-width="520"
                        :height="640"
                    >
                        <p v-for="n in 24" :key="n" class="mb-3 text-body-1">
                            Ligne de démonstration {{ n }} — contenu volontairement long pour activer le scroll.
                        </p>

                        <template #footer="{ close }">
                            <v-btn variant="text" flat @click="close">Annuler</v-btn>
                            <v-spacer />
                            <v-btn color="primary" flat @click="close">Confirmer</v-btn>
                        </template>
                    </AppModalBase>
                </div>

                <h3 class="text-h6 font-weight-semibold mb-3">Tabs (AppModalTabs)</h3>
                <div class="mb-8">
                    <p class="text-body-2 text-medium-emphasis mb-3">
                        <code>AppModalBase</code> + <code>AppBaseTabs</code> : tabs hors scroll, panels dans le body.
                    </p>
                    <v-btn color="primary" variant="tonal" flat @click="modalTabsOpen = true">Ouvrir modal à onglets</v-btn>

                    <AppModalTabs
                        v-model="modalTabsOpen"
                        v-model:tab="modalTabsTab"
                        title="Exemple à onglets"
                        subtitle="Les tabs restent fixes, le contenu scrolle en dessous."
                        :tabs="stackedTabItems"
                        :max-width="560"
                        :height="640"
                    >
                        <template #panel-recents>
                            <p v-for="n in 12" :key="n" class="mb-3 text-body-1">Recents — ligne {{ n }}</p>
                        </template>
                        <template #panel-favorites>Favorites tab content</template>
                        <template #panel-nearby>Nearby tab content</template>
                        <template #footer="{ close }">
                            <v-spacer />
                            <v-btn color="primary" flat @click="close">Fermer</v-btn>
                        </template>
                    </AppModalTabs>
                </div>

                <h3 class="text-h6 font-weight-semibold mb-3">Confirmation (AppConfirmationModal)</h3>
                <div class="mb-8">
                    <p class="text-body-2 text-medium-emphasis mb-3">
                        Header + footer uniquement — titre et message (style secondaire), sans section body.
                    </p>
                    <v-btn color="error" variant="tonal" flat @click="confirmationOpen = true">Ouvrir confirmation</v-btn>

                    <AppConfirmationModal
                        v-model="confirmationOpen"
                        title="Retirer cet ami ?"
                        message="Vous ne serez plus ami avec Alice. Vous pourrez renvoyer une demande plus tard."
                        confirm-label="Retirer"
                        confirm-color="error"
                        @confirm="confirmationOpen = false"
                    />
                </div>

                <h3 class="text-h6 font-weight-semibold mb-3">Statique (sans scroll)</h3>
                <div class="mb-8">
                    <p class="text-body-2 text-medium-emphasis mb-3">
                        Contenu court : <code>:scrollable="false"</code> — pas de perfect-scrollbar, hauteur auto.
                    </p>
                    <v-btn color="primary" variant="tonal" flat @click="modalStaticOpen = true">Ouvrir modal statique</v-btn>

                    <AppModalBase
                        v-model="modalStaticOpen"
                        title="Exemple sans scroll"
                        subtitle="Idéal pour une saisie OTP ou un formulaire court."
                        :max-width="440"
                        :scrollable="false"
                    >
                        <p class="text-body-1 mb-0">
                            Cette modale n’active pas perfect-scrollbar. Utilisez ce mode dès que le contenu ne peut pas déborder.
                        </p>

                        <template #footer="{ close }">
                            <v-btn variant="text" flat @click="close">Annuler</v-btn>
                            <v-spacer />
                            <v-btn color="primary" flat @click="close">OK</v-btn>
                        </template>
                    </AppModalBase>
                </div>
            </v-tabs-window-item>

            <v-tabs-window-item value="tabs">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppBaseTabs</code> — composant réutilisable configurable, inspiré des variantes de
                    <code>_template/modernize/views/ui-elements/UiTabs.vue</code>. Chaque variante est montrée
                    en style classique puis avec la prop <code>pilled</code>.
                </p>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Basic</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsBasic" :tabs="basicTabItems" preset="basic">
                            <template #panel-one>Item One</template>
                            <template #panel-two>Item Two</template>
                            <template #panel-three>Item Three</template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsBasicPilled" :tabs="basicTabItems" preset="basic" pilled>
                        <template #panel-one>Item One</template>
                        <template #panel-two>Item Two</template>
                        <template #panel-three>Item Three</template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Stacked</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsStacked" :tabs="stackedTabItems" preset="stacked">
                            <template #panel-recents>Item One</template>
                            <template #panel-favorites>Item two</template>
                            <template #panel-nearby>Item three</template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsStackedPilled" :tabs="stackedTabItems" preset="stacked" pilled>
                        <template #panel-recents>Item One</template>
                        <template #panel-favorites>Item two</template>
                        <template #panel-nearby>Item three</template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Center Active</h2>
                    <div class="mb-4">
                        <AppBaseTabs :model-value="'item-1'" :tabs="centerActiveItems" preset="center-active" />
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsCenterActivePilled" :tabs="centerActiveItems" preset="center-active" pilled />
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Custom Icons</h2>
                    <div class="mb-4">
                        <AppBaseTabs :model-value="'custom-1'" :tabs="customIconsItems" preset="custom-icons" show-arrows next-icon="mdi-arrow-right-bold-box-outline" prev-icon="mdi-arrow-left-bold-box-outline" />
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs
                        v-model="tabsCustomIconsPilled"
                        :tabs="customIconsItems"
                        preset="custom-icons"
                        pilled
                        show-arrows
                        next-icon="mdi-arrow-right-bold-box-outline"
                        prev-icon="mdi-arrow-left-bold-box-outline"
                    />
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Align Center</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsAlignCenter" :tabs="alignTabsItems" preset="align-center">
                            <template #panel-landscape>
                                <v-row>
                                    <v-col v-for="item in galleryLandscape" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                            <template #panel-products>
                                <v-row>
                                    <v-col v-for="item in galleryProducts" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                            <template #panel-abstract>
                                <v-row>
                                    <v-col v-for="item in galleryAbstract" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsAlignCenterPilled" :tabs="alignTabsItems" preset="align-center" pilled>
                        <template #panel-landscape>
                            <v-row>
                                <v-col v-for="item in galleryLandscape" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                        <template #panel-products>
                            <v-row>
                                <v-col v-for="item in galleryProducts" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                        <template #panel-abstract>
                            <v-row>
                                <v-col v-for="item in galleryAbstract" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Align End</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsAlignEnd" :tabs="alignTabsItems" preset="align-end">
                            <template #panel-landscape>
                                <v-row>
                                    <v-col v-for="item in galleryLandscape" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                            <template #panel-products>
                                <v-row>
                                    <v-col v-for="item in galleryProducts" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                            <template #panel-abstract>
                                <v-row>
                                    <v-col v-for="item in galleryAbstract" :key="item.img" cols="12" md="4" sm="6">
                                        <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                    </v-col>
                                </v-row>
                            </template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsAlignEndPilled" :tabs="alignTabsItems" preset="align-end" pilled>
                        <template #panel-landscape>
                            <v-row>
                                <v-col v-for="item in galleryLandscape" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                        <template #panel-products>
                            <v-row>
                                <v-col v-for="item in galleryProducts" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                        <template #panel-abstract>
                            <v-row>
                                <v-col v-for="item in galleryAbstract" :key="item.img" cols="12" md="4" sm="6">
                                    <v-img :src="item.img" alt="tab" cover class="w-100" height="250" />
                                </v-col>
                            </v-row>
                        </template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Icon</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsIcon" :tabs="iconTabItems" preset="icon">
                            <template #panel-phone>Item One</template>
                            <template #panel-heart>Item two</template>
                            <template #panel-user>Item three</template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsIconPilled" :tabs="iconTabItems" preset="icon" pilled>
                        <template #panel-phone>Item One</template>
                        <template #panel-heart>Item two</template>
                        <template #panel-user>Item three</template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Disabled</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsDisabled" :tabs="disabledTabItems" preset="disabled">
                            <template #panel-one>item one</template>
                            <template #panel-two>item two</template>
                            <template #panel-three>item three</template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsDisabledPilled" :tabs="disabledTabItems" preset="disabled" pilled>
                        <template #panel-one>item one</template>
                        <template #panel-two>item two</template>
                        <template #panel-three>item three</template>
                    </AppBaseTabs>
                </section>

                <section class="tabs-showcase-group">
                    <h2 class="text-h5 font-weight-semibold mb-3">Colors</h2>
                    <div class="mb-4">
                        <AppBaseTabs v-model="tabsColors" :tabs="colorTabItems" preset="colors">
                            <template #panel-one>item one</template>
                            <template #panel-two>item two</template>
                            <template #panel-three>item three</template>
                        </AppBaseTabs>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">pilled</p>
                    <AppBaseTabs v-model="tabsColorsPilled" :tabs="colorTabItems" preset="colors" pilled>
                        <template #panel-one>item one</template>
                        <template #panel-two>item two</template>
                        <template #panel-three>item three</template>
                    </AppBaseTabs>
                </section>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<style scoped>
.tabs-showcase-group {
    padding-bottom: 2rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(var(--v-theme-borderColor), 1);
}

.tabs-showcase-group:last-child {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
}
</style>
