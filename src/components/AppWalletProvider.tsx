"use client";

import React, { useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { RPC_URL } from "@/config/network";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

export default function AppWalletProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Use centralized RPC URL from network config
    const endpoint = useMemo(() => RPC_URL, []);

    const wallets = useMemo(
        () => [
            /**
             * Wallets that support the standard wallet standard will be added automatically.
             * Your users' wallets will generally be detected without extra configuration.
             */
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
