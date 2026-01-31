import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { useMemo } from "react";
import idl from "../utils/obsidian-idl.json";
import { PROGRAM_ID } from "../config/network";

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
        return new Program(idl as any, provider) as any;
    }, [provider]);

    return {
        program,
        provider,
        isLoading: !program,
    };
};
