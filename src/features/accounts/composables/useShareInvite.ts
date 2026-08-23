import { computed, reactive, ref, watch, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from 'vue-i18n';
import { listAllFriends, type FriendItem } from '@/features/friends';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '../stores/accounts-store';
import type { ShareRole } from '../types';

export function useShareInvite(options: {
    accountPublicId: MaybeRefOrGetter<string>;
    isOpen: MaybeRefOrGetter<boolean>;
    close: () => void;
}) {
    const { t } = useI18n();
    const store = useAccountsStore();

    const friends = ref<FriendItem[]>([]);
    const loadingFriends = ref(false);
    const friendQuery = ref('');
    const selectedUserPublicId = ref<string | null>(null);
    const role = ref<ShareRole>('viewer');
    const localError = ref<string | null>(null);

    const excludedIds = computed(() => new Set(store.shares.map((s) => s.userPublicId)));

    const availableFriends = computed(() => friends.value.filter((f) => f.user.publicId && !excludedIds.value.has(f.user.publicId)));

    const filteredFriends = computed(() => {
        const query = friendQuery.value.trim().toLowerCase();
        if (!query) return availableFriends.value;
        return availableFriends.value.filter((f) => {
            const haystack = [f.user.firstName, f.user.name, f.user.username, f.user.publicId].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(query);
        });
    });

    async function loadFriends() {
        loadingFriends.value = true;
        localError.value = null;
        try {
            friends.value = await listAllFriends();
        } catch (e: unknown) {
            localError.value = getErrorMessage(e);
            friends.value = [];
        } finally {
            loadingFriends.value = false;
        }
    }

    watch(
        () => toValue(options.isOpen),
        (value) => {
            if (!value) return;
            selectedUserPublicId.value = null;
            friendQuery.value = '';
            role.value = 'viewer';
            localError.value = null;
            void loadFriends();
        },
        { immediate: true }
    );

    function selectFriend(userPublicId: string) {
        selectedUserPublicId.value = userPublicId;
        localError.value = null;
    }

    async function submitInvite() {
        if (!selectedUserPublicId.value) {
            localError.value = t('comptesPage.share.errors.friendRequired');
            return;
        }
        localError.value = null;
        try {
            const friend = availableFriends.value.find((f) => f.user.publicId === selectedUserPublicId.value);
            await store.inviteShare(
                toValue(options.accountPublicId),
                selectedUserPublicId.value,
                role.value,
                friend?.user.profilePicture ?? null
            );
            options.close();
        } catch (e: unknown) {
            localError.value = getErrorMessage(e);
        }
    }

    const acting = computed(() => store.acting);

    return reactive({
        acting,
        friendQuery,
        selectedUserPublicId,
        role,
        localError,
        loadingFriends,
        availableFriends,
        filteredFriends,
        selectFriend,
        submitInvite
    });
}
