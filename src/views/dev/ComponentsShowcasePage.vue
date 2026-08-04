<script setup lang="ts">
/**
 * Showcase composants (dev only).
 * Onglet Alert = clone `_template/modernize/components/ui-components/alert/*`.
 * Onglet Chip = clone `_template/modernize/components/ui-components/chip/*` via AppChip.
 * Onglet Modal = AppModalBase / AppConfirmationModal.
 */
defineOptions({ name: 'ComponentsShowcasePage' });

import { computed, ref } from 'vue';
import { ChecksIcon, CircleXIcon, MoodSmileIcon, UserCircleIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppChip from '@/components/shared/AppChip.vue';
import AppConfirmationModal from '@/components/shared/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import user1 from '@/assets/images/profile/avatar/user-1.jpg';
import user2 from '@/assets/images/profile/avatar/user-2.jpg';
import user5 from '@/assets/images/profile/avatar/user-5.jpg';

const tab = ref('alert');
const closableOpen = ref(true);

const modalScrollableOpen = ref(false);
const modalStaticOpen = ref(false);
const confirmationOpen = ref(false);

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
            <v-tab value="modal">Modal</v-tab>
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

            <v-tabs-window-item value="modal">
                <p class="text-body-2 text-medium-emphasis mb-6">
                    <code>AppModalBase</code> — shell modal Spend.Up. Doc :
                    <code>docs/components/modal/modalbase-component.md</code>
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
        </v-tabs-window>
    </div>
</template>
