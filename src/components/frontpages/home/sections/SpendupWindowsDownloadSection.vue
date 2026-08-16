<script setup lang="ts">
import { BrandWindowsIcon, DownloadIcon } from 'vue-tabler-icons';

/** Installeur servi depuis `public/downloads/` — nom stable pour ne pas casser le lien à chaque release. */
const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';

const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;
</script>

<template>
    <section class="py-12 py-md-16">
        <v-container class="max-width-1218">
            <v-card class="su-card pa-8 pa-md-10 rounded-xl border" elevation="0">
                <v-row align="center">
                    <v-col cols="12" md="8" class="pe-md-8">
                        <div class="d-inline-flex align-center ga-2 mb-4">
                            <div class="su-icon-wrap rounded-lg">
                                <BrandWindowsIcon size="26" class="text-primary" stroke-width="1.5" />
                            </div>
                            <span class="text-uppercase text-primary text-13 font-weight-semibold letter-spacing-1">
                                Application bureau
                            </span>
                        </div>

                        <h2 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Téléchargez notre application bureau Windows</h2>

                        <p class="text-16 text-medium-emphasis lh-lg mb-0">
                            Installez Spend.Up sur votre PC Windows pour accéder à votre espace financier depuis le bureau, avec la même
                            expérience sécurisée que sur le web.
                        </p>
                    </v-col>

                    <v-col cols="12" md="4" class="text-md-end mt-6 mt-md-0">
                        <v-btn color="primary" size="large" class="px-6 text-none" flat :href="windowsDownloadUrl" download>
                            <DownloadIcon size="20" class="me-2" stroke-width="1.5" />
                            Télécharger pour Windows
                        </v-btn>

                        <p class="text-13 text-medium-emphasis mt-3 mb-0">Installeur .msi — Windows 10/11 (64 bits)</p>
                    </v-col>
                </v-row>
            </v-card>
        </v-container>
    </section>
</template>
