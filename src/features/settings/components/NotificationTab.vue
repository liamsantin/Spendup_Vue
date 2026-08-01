<script setup lang="ts">
import { ref } from 'vue';
import { BellIcon, CalendarIcon, ClockIcon, CookieIcon, DownloadIcon, PlayerPauseIcon } from 'vue-tabler-icons';
import { notificationPreferences } from '../data/notificationPreferences';

const switchoff3 = ref(false);
</script>

<template>
    <div class="notification-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <BellIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Préférences de notification</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Sélectionnez les notifications que vous souhaitez recevoir par e-mail. Notez que vous ne pouvez pas désactiver
                            les messages de service, tels que les notifications de paiement, de sécurité ou légales.
                        </div>
                        <div class="mt-6">
                            <v-label class="mb-2 font-weight-medium">Adresse e-mail*</v-label>
                            <v-text-field color="primary" variant="outlined" type="email" hide-details></v-text-field>
                            <span class="text-subtitle-1 text-medium-emphasis">Requis pour les notifications.</span>
                        </div>

                        <div class="d-flex align-sm-center align-start mt-7" v-for="list in notificationPreferences" :key="list.title">
                            <v-avatar size="48" class="mr-2" rounded="md" color="lightprimary">
                                <component :is="list.icon" stroke-width="2" size="22" />
                            </v-avatar>
                            <div class="pl-4">
                                <h6 class="text-h6 mb-3 mt-n1">{{ list.title }}</h6>
                                <h5 class="text-subtitle-1 text-medium-emphasis">{{ list.subtitle }}</h5>
                            </div>
                            <div class="ml-auto mr-1 pa-sm-1 pa-6 pl-7">
                                <v-switch :model-value="list.switch" hide-details color="primary"></v-switch>
                            </div>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <CalendarIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Date &amp; heure</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Fuseaux horaires et paramètres d’affichage du calendrier.
                        </div>
                        <div>
                            <div class="d-flex align-center mt-7">
                                <v-avatar size="48" class="mr-2" rounded="md" color="lightprimary">
                                    <ClockIcon size="22" />
                                </v-avatar>
                                <div class="pl-4">
                                    <h5 class="text-subtitle-1 text-medium-emphasis mb-1">Fuseau horaire</h5>
                                    <h6 class="text-h6">(UTC + 01:00) Paris, Bruxelles</h6>
                                </div>
                                <div class="ml-auto">
                                    <v-btn size="30" icon variant="flat" class="lightprimary d-flex">
                                        <v-avatar size="30">
                                            <DownloadIcon size="22" />
                                        </v-avatar>
                                        <v-tooltip activator="parent" location="bottom">Télécharger</v-tooltip>
                                    </v-btn>
                                </div>
                            </div>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <CookieIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Ignorer le suivi</h4>
                        </div>
                        <div>
                            <div class="d-flex align-center mt-7">
                                <v-avatar size="48" class="mr-2" rounded="md" color="lightprimary">
                                    <PlayerPauseIcon size="22" />
                                </v-avatar>
                                <div class="pl-4">
                                    <h6 class="text-h6 mb-3 mt-n1">Ignorer le suivi du navigateur</h6>
                                    <h5 class="text-subtitle-1 text-medium-emphasis">Cookies du navigateur</h5>
                                </div>
                                <div class="ml-auto mr-1 pa-sm-0 pl-sm-1 pa-6 pl-7">
                                    <v-switch v-model="switchoff3" hide-details color="primary"></v-switch>
                                </div>
                            </div>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.notification-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
