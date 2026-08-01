<script setup lang="ts">
import { computed } from 'vue';
import { AtIcon, HashIcon, MailIcon, PhoneIcon } from 'vue-tabler-icons';
import { profileDD } from '@/data/admin/headerData';
import { useAuthStore } from '@/features/auth';

const authStore = useAuthStore();

const displayName = computed(() => authStore.displayName || 'Utilisateur');

const profileDetails = computed(() => {
    const user = authStore.user;
    if (!user) return [];

    const entries: { key: string; value: string; icon: typeof HashIcon }[] = [];

    const publicId = user.userPublicId?.trim();
    if (publicId) entries.push({ key: 'id', value: publicId.replace(/^#/, ''), icon: HashIcon });

    const username = user.username?.trim();
    if (username) entries.push({ key: 'username', value: username, icon: AtIcon });

    const email = user.email?.trim();
    if (email) entries.push({ key: 'email', value: email, icon: MailIcon });

    const phone = user.phone?.trim();
    if (phone) entries.push({ key: 'phone', value: phone, icon: PhoneIcon });

    return entries;
});
</script>

<template>
    <v-menu :close-on-content-click="false">
        <template v-slot:activator="{ props }">
            <v-btn class="custom-hover-primary" variant="text" v-bind="props" icon>
                <v-avatar size="35">
                    <img src="@/assets/images/profile/user-1.jpg" width="35" alt="user" />
                </v-avatar>
            </v-btn>
        </template>
        <v-sheet rounded="md" width="360" elevation="10">
            <div class="px-8 pt-6">
                <h6 class="text-h5 font-weight-medium">Profil utilisateur</h6>
                <div class="d-flex align-center mt-4 pb-6">
                    <v-avatar size="80">
                        <img src="@/assets/images/profile/user-1.jpg" width="80" />
                    </v-avatar>
                    <div class="ml-3 min-w-0">
                        <h6 class="text-h6 mb-n1">{{ displayName }}</h6>
                        <div v-for="detail in profileDetails" :key="detail.key" class="d-flex align-center mt-1">
                            <component :is="detail.icon" size="18" stroke-width="1.5" class="flex-shrink-0" />
                            <span class="text-subtitle-1 font-weight-regular textSecondary ml-2 text-truncate">{{ detail.value }}</span>
                        </div>
                    </div>
                </div>
                <v-divider></v-divider>
            </div>
            <v-list class="py-0 theme-list" lines="two">
                <v-list-item v-for="item in profileDD" :key="item.title" class="py-4 px-8 custom-text-primary" :to="item.href">
                    <template v-slot:prepend>
                        <v-avatar size="48" color="lightprimary" class="mr-3" rounded="md">
                            <img :src="item.avatar" width="24" height="24" :alt="item.title" />
                        </v-avatar>
                    </template>
                    <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-2 custom-title">{{ item.title }}</h6>
                    </div>
                    <p class="text-subtitle-1 font-weight-regular textSecondary">{{ item.subtitle }}</p>
                </v-list-item>
            </v-list>
            <div class="pt-4 pb-6 px-8 text-center">
                <v-btn color="primary" variant="outlined" block @click="authStore.logout()">Se déconnecter</v-btn>
            </div>
        </v-sheet>
    </v-menu>
</template>
