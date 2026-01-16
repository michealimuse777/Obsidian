import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { useMemo } from "react";
import idl from "../utils/obsidian-idl.json";
import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");

export const useProgram = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, {
            preflightCommitment: "processed",
        });
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl as any, provider);
    }, [provider]);

    return {
        program,
        provider,
        isLoading: !program,
    };
};
