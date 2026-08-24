import { friendsApi } from '@/features/friends/api';
import type { FriendItem, FriendsPageResult } from '@/features/friends/types';

export const FRIENDS_LIST_ALL_PAGE_SIZE = 100;
/** Garde-fou anti-boucle (100 × 50 = 5000 amis max côté client). */
export const FRIENDS_LIST_ALL_MAX_PAGES = 50;

type ListFriendsPage = (page: number, pageSize: number) => Promise<FriendsPageResult<FriendItem>>;

/**
 * Charge toutes les pages d’amis acceptés (invite partage, etc.).
 * @param list Fn de pagination (défaut : `friendsApi.list`).
 * @param pageSize Taille de page (défaut 100).
 * @param maxPages Nombre max de pages (défaut 50).
 */
export async function listAllFriends(
    list: ListFriendsPage = (page, pageSize) => friendsApi.list(page, pageSize),
    pageSize = FRIENDS_LIST_ALL_PAGE_SIZE,
    maxPages = FRIENDS_LIST_ALL_MAX_PAGES
): Promise<FriendItem[]> {
    const all: FriendItem[] = [];
    let page = 1;
    let totalCount = Number.POSITIVE_INFINITY;

    while (page <= maxPages && all.length < totalCount) {
        const result = await list(page, pageSize);
        const items = Array.isArray(result?.items) ? result.items : [];
        totalCount = typeof result?.totalCount === 'number' ? result.totalCount : all.length + items.length;
        all.push(...items);
        if (items.length === 0 || items.length < pageSize) break;
        page += 1;
    }

    return all;
}
