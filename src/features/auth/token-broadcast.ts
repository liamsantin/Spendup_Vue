import type { AuthTokens } from '@/features/auth/types';
import { readTokenChainId } from '@/features/auth/session-storage';

const CHANNEL_NAME = 'spendup-auth-tokens';

type TokensMessage = { type: 'tokens'; chain: string; tokens: AuthTokens };

export type TokenBroadcast = {
    /** Annonce aux onglets de la même chaîne les jetons tout juste obtenus par un refresh. */
    publish(tokens: AuthTokens): void;
    close(): void;
};

/**
 * Partage les jetons rotés entre les onglets qui détiennent la même chaîne de refresh (onglet dupliqué).
 * Sans cela, l'onglet qui n'a pas rafraîchi présentait l'ancien jeton, recevait 401 et déconnectait les deux.
 * Le canal est limité à l'origine de l'application (comme sessionStorage) ; un onglet d'une autre session
 * (autre identifiant de chaîne) ignore les messages.
 */
export function createTokenBroadcast(onTokens: (tokens: AuthTokens) => void): TokenBroadcast {
    if (typeof BroadcastChannel === 'undefined') {
        return { publish() {}, close() {} };
    }
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as Partial<TokensMessage> | null;
        if (!message || message.type !== 'tokens' || !message.chain || !message.tokens) return;
        const chain = readTokenChainId();
        if (!chain || chain !== message.chain) return;
        onTokens(message.tokens);
    };
    return {
        publish(tokens: AuthTokens) {
            const chain = readTokenChainId();
            if (!chain || !tokens.refreshToken) return;
            const message: TokensMessage = { type: 'tokens', chain, tokens };
            channel.postMessage(message);
        },
        close() {
            channel.close();
        }
    };
}
