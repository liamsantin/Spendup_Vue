<script setup lang="ts">
import { ref } from 'vue';

const select = ref('France');
const location = ref(['France', 'Belgique', 'Suisse', 'Canada']);

const Currencyselect = ref('Euro (€)');
const Currency = ref(['Euro (€)', 'Dollar US ($)', 'Franc suisse (CHF)', 'Livre sterling (£)']);

const currenypwd = ref('');
const newpwd = ref('');
const confirmpwd = ref('');

const namemodel = ref('');
const storemodel = ref('');
const storemail = ref('');
const storephone = ref('');
const storeaddress = ref('');
</script>

<template>
    <v-card elevation="10">
        <v-row class="ma-sm-n2 ma-n1">
            <v-col cols="12" sm="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Modifier le profil</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Changez votre photo de profil ici</div>
                        <div class="text-center mt-6 mb-6">
                            <v-avatar size="120">
                                <img src="@/assets/images/profile/user-1.jpg" height="120" alt="image" />
                            </v-avatar>
                        </div>
                        <div class="d-flex justify-center">
                            <v-btn color="primary" class="mx-2" flat>Téléverser</v-btn>
                            <v-btn color="error" class="mx-2" variant="outlined" flat>Réinitialiser</v-btn>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-center my-sm-8 my-6">
                            JPG, GIF ou PNG autorisés. Taille max. 800 Ko
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
            <v-col cols="12" sm="6">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Modifier le mot de passe</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Pour changer votre mot de passe, confirmez-le ici</div>
                        <div class="mt-5">
                            <v-label class="mb-2 font-weight-medium">Mot de passe actuel</v-label>
                            <v-text-field color="primary" variant="outlined" type="password" v-model="currenypwd" />
                            <v-label class="mb-2 font-weight-medium">Nouveau mot de passe</v-label>
                            <v-text-field color="primary" variant="outlined" type="password" v-model="newpwd" />
                            <v-label class="mb-2 font-weight-medium">Confirmer le mot de passe</v-label>
                            <v-text-field color="primary" variant="outlined" type="password" v-model="confirmpwd" hide-details />
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
            <v-col cols="12">
                <v-card elevation="10">
                    <v-card-item>
                        <h5 class="text-h5">Informations personnelles</h5>
                        <div class="text-subtitle-1 text-medium-emphasis mt-2">Modifiez vos informations personnelles puis enregistrez</div>
                        <div class="mt-5">
                            <v-row>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Votre nom</v-label>
                                    <v-text-field color="primary" variant="outlined" type="text" v-model="namemodel" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Nom de l’entreprise</v-label>
                                    <v-text-field color="primary" variant="outlined" type="text" v-model="storemodel" hide-details />
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Localisation</v-label>
                                    <v-select
                                        v-model="select"
                                        :items="location"
                                        label="Sélectionner"
                                        single-line
                                        variant="outlined"
                                        hide-details
                                    ></v-select>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Devise</v-label>
                                    <v-select
                                        v-model="Currencyselect"
                                        :items="Currency"
                                        label="Sélectionner"
                                        single-line
                                        variant="outlined"
                                        hide-details
                                    ></v-select>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">E-mail</v-label>
                                    <v-text-field
                                        color="primary"
                                        variant="outlined"
                                        type="email"
                                        v-model="storemail"
                                        hide-details
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-label class="mb-2 font-weight-medium">Téléphone</v-label>
                                    <v-text-field
                                        color="primary"
                                        variant="outlined"
                                        type="text"
                                        v-model="storephone"
                                        hide-details
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="12">
                                    <v-label class="mb-2 font-weight-medium">Adresse</v-label>
                                    <v-text-field
                                        color="primary"
                                        variant="outlined"
                                        type="text"
                                        v-model="storeaddress"
                                        hide-details
                                    ></v-text-field>
                                </v-col>
                            </v-row>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
        <div class="d-flex justify-end mt-5">
            <v-btn size="large" color="primary" class="mr-4" flat>Enregistrer</v-btn>
            <v-btn size="large" class="bg-lighterror text-error" flat>Annuler</v-btn>
        </div>
    </v-card>
</template>
