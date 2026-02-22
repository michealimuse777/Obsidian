/**
 * Network Configuration
 * Single source of truth for all network-related settings
 */

export type NetworkType = 'local' | 'devnet';

export const NETWORK: NetworkType =
    (process.env.NEXT_PUBLIC_NETWORK as NetworkType) ?? 'devnet';

export const CONFIG = {
    local: {
        rpcUrl: "http://127.0.0.1:8899",
        programId: "CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua",
        wsEndpoint: "ws://127.0.0.1:8900",
        displayName: "Localnet",
    },
    devnet: {
        rpcUrl: "https://api.devnet.solana.com",
        programId: "CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua",
        wsEndpoint: "wss://api.devnet.solana.com",
        displayName: "Devnet",
    },
} as const;

export const ACTIVE_CONFIG = CONFIG[NETWORK];

// Helper exports for convenience
export const RPC_URL = ACTIVE_CONFIG.rpcUrl;
export const PROGRAM_ID = ACTIVE_CONFIG.programId;
export const WS_ENDPOINT = ACTIVE_CONFIG.wsEndpoint;
export const NETWORK_DISPLAY_NAME = ACTIVE_CONFIG.displayName;
