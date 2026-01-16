'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle, Wallet } from 'lucide-react';
import { useProgram } from '@/hooks/useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

export default function BidForm() {
    const { program } = useProgram();
    const { publicKey } = useWallet();

    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<'idle' | 'encrypting' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [txHash, setTxHash] = useState('');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const [launchState, setLaunchState] = useState<{
        authority: PublicKey;
        mint: PublicKey;
        launchPool: PublicKey;
        totalTokens: BN;
    } | null>(null);

    // Reset form state when wallet changes
    useEffect(() => {
        setStatus('idle');
        setAmount('');
        setTxHash('');
        setErrorMessage('');
    }, [publicKey]);

    // Fetch Launch State on Mount
    useEffect(() => {
        if (!program) return;

        const fetchLaunch = async () => {
            try {
                const [launchPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("launch")],
                    program.programId
                );
                const account = await program.account.launch.fetchNullable(launchPda);
                if (account) {
                    setLaunchState(account as any);
                }
            } catch (err) {
                console.error("Failed to fetch launch state:", err);
            }
        };

        fetchLaunch();
    }, [program]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !publicKey || !program || !launchState) return;
        if (status === 'encrypting' || status === 'submitting') return; // Prevent double-submit

        try {
            setErrorMessage('');

            // 1. Encryption Simulation (Arcium Placeholder)
            setStatus('encrypting');
            await new Promise(r => setTimeout(r, 1000));

            // Create a mock encrypted payload (In Phase 4 this comes from Arcium SDK)
            const encryptedPayload = Buffer.from(new TextEncoder().encode(`ENCRYPTED:${amount}`));
            const amountBN = new BN(parseFloat(amount) * 1_000_000); // Assuming 6 decimals for USDC/Mint

            setStatus('submitting');

            // 2. Derive Accounts
            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch")],
                program.programId
            );

            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid"), publicKey.toBuffer()],
                program.programId
            );

            console.log("Bid PDA:", bidPda.toBase58());
            console.log("Bidder PublicKey:", publicKey.toBase58());

            // Check if bid already exists on-chain
            try {
                const existingBid = await program.account.bid.fetchNullable(bidPda);
                if (existingBid) {
                    console.log("Bid already exists on-chain:", existingBid);
                    setAmount('');
                    setTxHash("✓ Your bid is already on-chain!");
                    setStatus('success');
                    return;
                }
            } catch (checkErr) {
                console.log("Could not check existing bid, proceeding with submission...");
            }

            // User's ATA for the Payment Mint
            const fromAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID // Match deployed Mint (Standard SPL)
            );

            // Launch Pool ATA (Destination) - Defined in Launch Account
            const toAta = launchState.launchPool;

            // 3. Send Transaction
            const tx = await program.methods
                .submitEncryptedBid(encryptedPayload, amountBN)
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    from: fromAta,
                    to: toAta,
                    mint: launchState.mint,
                    bidder: publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: spl.TOKEN_PROGRAM_ID, // Use Standard Token Program
                })
                .rpc();

            console.log("Transaction Signature:", tx);
            setAmount('');
            setTxHash(tx);
            setStatus('success');

            if (window.innerWidth < 768) {
                setTimeout(() => setIsMobileOpen(false), 2000);
            }

        } catch (err: any) {
            console.error("Bid Submission Error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Transaction failed");
        }
    };

    if (!launchState && program) {
        return (
            <div className="w-full max-w-sm mx-auto p-8 backdrop-blur-xl bg-black/40 rounded-xl border border-white/5 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/30 mb-4" />
                <p className="text-xs font-mono text-white/50">Loading Launch State...</p>
                {/* Optional: Add 'Initialize' button here for dev testing if authority */}
            </div>
        );
    }

    // Fix: Assign JSX to a variable instead of a nested component function to prevent focus loss on re-render.
    const formElements = (
        <>
            <h3 className="text-sm font-mono tracking-widest text-white/40 mb-8 flex items-center justify-between uppercase">
                <span>Confidential Input</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <div className="relative group">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); if (status === 'success') setStatus('idle'); }}
                            placeholder="0.00"
                            disabled={status === 'encrypting' || status === 'submitting'}
                            className="w-full bg-black/20 border-b border-white/10 py-3 px-0 text-3xl font-display text-white focus:outline-none focus:border-accent-purple/50 transition-all placeholder:text-white/5"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-mono text-white/20">USDC</span>
                    </div>
                </div>

                {!publicKey ? (
                    <div className="p-4 rounded-sm border border-yellow-500/20 bg-yellow-500/5 text-yellow-200/50 text-xs font-mono text-center">
                        <Wallet className="w-4 h-4 mx-auto mb-2 opacity-50" />
                        Please connect wallet to bid
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={status === 'encrypting' || status === 'submitting' || !amount}
                        className={`w-full py-3.5 rounded-sm font-mono text-xs tracking-[0.15em] uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden
                        ${status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {status === 'idle' && (
                            <>
                                Encrypt & Submit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                        {status === 'error' && (
                            <>
                                Retry <ArrowRight className="w-4 h-4" />
                            </>
                        )}

                        {status === 'encrypting' && (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Encrypting...</span>
                        )}

                        {status === 'submitting' && (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</span>
                        )}

                        {status === 'success' && (
                            <span className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Registered</span>
                        )}

                        <AnimatePresence>
                            {(status === 'encrypting' || status === 'submitting') && (
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 3.5, ease: "linear" }}
                                    className="absolute bottom-0 left-0 h-0.5 bg-accent-purple"
                                />
                            )}
                        </AnimatePresence>
                    </button>
                )}
            </form>

            <AnimatePresence>
                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono break-all"
                    >
                        {errorMessage}
                    </motion.div>
                )}
                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 p-4 rounded-lg bg-white/5 text-sm text-white/50 font-mono border border-white/5"
                    >
                        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Confirmation Hash</p>
                        <p className="truncate">{txHash}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return (
        <>
            {/* DESKTOP VIEW: Embedded Card */}
            <div className="hidden md:block w-full max-w-sm mx-auto p-1">
                <div className="backdrop-blur-xl bg-[#0f021a]/60 rounded-xl p-8 relative overflow-hidden border border-white/5 shadow-2xl">
                    {formElements}
                </div>
            </div>

            {/* MOBILE VIEW: Collapsed Action & Slide-Up Panel */}
            <div className="md:hidden">
                {/* Trigger Button */}
                {!isMobileOpen && (
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => setIsMobileOpen(true)}
                        className="fixed bottom-8 left-6 right-6 h-14 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-between px-6 text-white/60 font-mono text-xs uppercase tracking-widest shadow-2xl hover:bg-white/15 transition-all z-40"
                    >
                        <span>Secure Input</span>
                        <Lock className="w-4 h-4 opacity-50" />
                    </motion.button>
                )}

                {/* Slide-Up Drawer */}
                <AnimatePresence>
                    {isMobileOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            />

                            {/* Drawer */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed bottom-0 left-0 right-0 bg-[#0c0115] rounded-t-3xl border-t border-white/10 p-8 pb-12 z-50 shadow-2xl"
                            >
                                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8" />
                                {formElements}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
