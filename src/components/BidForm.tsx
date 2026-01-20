'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle, Wallet } from 'lucide-react';
import { useProgram } from '@/hooks/useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { arcium } from '@/lib/arcium';
import { ARCIUM_CLUSTER_PUBKEY } from '@/utils/constants';

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
        isFinalized: boolean;
    } | null>(null);

    // Bid/Allocation State
    const [bidData, setBidData] = useState<{
        txHash?: string;
        allocation?: number;
        isClaimed?: boolean;
        isProcessed?: boolean;
    } | null>(null);

    // Reset form state when wallet changes
    useEffect(() => {
        setStatus('idle');
        setAmount('');
        setTxHash('');
        setErrorMessage('');
        setBidData(null);
    }, [publicKey]);

    // Initial Check for Existing Bid & Fetch Launch State
    useEffect(() => {
        if (!program || !publicKey) return;

        const init = async () => {
            try {
                // 1. Fetch Launch State
                const [launchPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("launch")],
                    program.programId
                );
                const launchAccount = await program.account.launch.fetchNullable(launchPda);
                if (launchAccount) {
                    setLaunchState(launchAccount as any);
                }

                // 2. Check for Existing Bid
                const [bidPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bid"), publicKey.toBuffer()],
                    program.programId
                );
                const existingBid = await program.account.bid.fetchNullable(bidPda);
                if (existingBid) {
                    console.log("Found existing bid:", existingBid);
                    const bidAccount = existingBid as any;
                    setBidData({
                        txHash: "Registered",
                        allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                        isClaimed: bidAccount.isClaimed || false,
                        isProcessed: bidAccount.isProcessed || false,
                    });
                }
            } catch (err) {
                console.error("Error initializing BidForm:", err);
            }
        };

        init();
    }, [program, publicKey]);

    const isSubmittingRef = useRef(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !publicKey || !program || !launchState) return;
        if (status === 'encrypting' || status === 'submitting') return;
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;

        try {
            setErrorMessage('');

            // 1. Encryption (Real Arcium)
            setStatus('encrypting');
            // Simulate network delay for effect
            await new Promise(r => setTimeout(r, 600));

            // Encrypt data for the Cypher Node (Cluster)
            // Format: "ENCRYPTED:<AMOUNT>"
            const payloadString = `ENCRYPTED:${amount}`;
            const encryptedUint8 = arcium.encrypt(payloadString, ARCIUM_CLUSTER_PUBKEY);
            const encryptedPayload = Buffer.from(encryptedUint8);

            const amountBN = new BN(parseFloat(amount) * 1_000_000);

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

            // Safety Check
            const existingBid = await program.account.bid.fetchNullable(bidPda);
            if (existingBid) {
                toast.success('Bid verified on-chain');
                const bidAccount = existingBid as any;
                setBidData({
                    txHash: "Verified",
                    allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                    isClaimed: bidAccount.isClaimed || false,
                    isProcessed: bidAccount.isProcessed || false,
                });
                isSubmittingRef.current = false;
                return;
            }

            // User's ATA
            const fromAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID
            );

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
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log("Transaction Signature:", tx);
            toast.success('Bid Encrypted & Submitted');

            setBidData({ txHash: tx, allocation: 0, isClaimed: false, isProcessed: false });
            setStatus('success');

            if (window.innerWidth < 768) {
                setTimeout(() => setIsMobileOpen(false), 2000);
            }

        } catch (err: any) {
            console.error("Bid Submission Error:", err);

            // Handle "already processed"
            const errMsg = err.message || "";
            if (errMsg.includes("already been processed") || errMsg.includes("already in use")) {
                try {
                    const [bidPda] = PublicKey.findProgramAddressSync([Buffer.from("bid"), publicKey!.toBuffer()], program!.programId);
                    const existingBid = await program!.account.bid.fetchNullable(bidPda);
                    if (existingBid) {
                        toast.success('Bid verified on-chain');
                        const bidAccount = existingBid as any;
                        setBidData({
                            txHash: "Verified",
                            allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                            isClaimed: bidAccount.isClaimed || false,
                            isProcessed: bidAccount.isProcessed || false,
                        });
                        return;
                    }
                } catch (checkErr) { console.log(checkErr); }
            }

            setStatus('error');
            setErrorMessage(err.message || "Transaction failed");
            toast.error('Submission Failed', { description: err.message });
        } finally {
            isSubmittingRef.current = false;
        }
    };

    // Loading State
    if (!launchState && program && !bidData) {
        return (
            <div className="w-full max-w-sm mx-auto p-8 backdrop-blur-xl bg-black/40 rounded-xl border border-white/5 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/30 mb-4" />
                <p className="text-xs font-mono text-white/50">Loading Launch State...</p>
            </div>
        );
    }

    // Handle Claim
    const handleClaim = async () => {
        if (!program || !publicKey || !launchState) return;

        try {
            setStatus('submitting');

            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch")],
                program.programId
            );
            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid"), publicKey.toBuffer()],
                program.programId
            );

            const userAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID
            );

            const tx = await (program.methods as any)
                .claimTokens()
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    launchPool: launchState.launchPool,
                    mint: launchState.mint,
                    userAta: userAta,
                    user: publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                })
                .rpc();

            toast.success('Tokens Claimed!', { description: `Tx: ${tx.slice(0, 8)}...` });
            setBidData(prev => prev ? { ...prev, isClaimed: true } : null);
            setStatus('success');
        } catch (err: any) {
            console.error("Claim error:", err);
            toast.error('Claim Failed', { description: err.message });
            setStatus('error');
        }
    };

    // DASHBOARD VIEW (If Bid Exists)
    if (bidData) {
        const isAuctionFinalized = launchState?.isFinalized || false;
        const hasAllocation = (bidData.allocation || 0) > 0;
        const canClaim = isAuctionFinalized && hasAllocation && !bidData.isClaimed;

        return (
            <div className="w-full max-w-sm mx-auto p-1">
                <div className="backdrop-blur-xl bg-[#0f021a]/80 rounded-xl p-8 border border-white/10 shadow-2xl text-center space-y-6">
                    {/* Status Icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 shadow-lg ${bidData.isClaimed
                        ? 'bg-green-500/10 ring-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : hasAllocation
                            ? 'bg-accent-purple/10 ring-accent-purple/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                            : 'bg-white/5 ring-white/10'
                        }`}>
                        {bidData.isClaimed ? (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        ) : hasAllocation ? (
                            <span className="text-2xl">🎉</span>
                        ) : (
                            <Lock className="w-6 h-6 text-white/40" />
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <h3 className="text-xl font-display text-white mb-1">
                            {bidData.isClaimed ? 'Tokens Claimed!' : hasAllocation ? 'You Won!' : 'Bid Registered'}
                        </h3>
                        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                            {isAuctionFinalized
                                ? (bidData.isClaimed ? 'Claimed Successfully' : 'Auction Complete')
                                : 'Auction In Progress'}
                        </p>
                    </div>

                    {/* Details Card */}
                    <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-3 text-left">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/30 font-mono">Bid Amount</span>
                            <span className="text-accent-purple font-mono flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Encrypted
                            </span>
                        </div>

                        {bidData.isProcessed && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/30 font-mono">Allocation</span>
                                <span className={`font-mono font-bold ${hasAllocation ? 'text-green-400' : 'text-white/40'}`}>
                                    {hasAllocation ? `${bidData.allocation?.toLocaleString()} OBS` : 'Pending...'}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/30 font-mono">Status</span>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded ${bidData.isClaimed
                                ? 'bg-green-500/20 text-green-400'
                                : isAuctionFinalized
                                    ? 'bg-accent-purple/20 text-accent-purple'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {bidData.isClaimed ? 'CLAIMED' : isAuctionFinalized ? 'READY' : 'PENDING'}
                            </span>
                        </div>
                    </div>

                    {/* Claim Button */}
                    {canClaim && (
                        <button
                            onClick={handleClaim}
                            disabled={status === 'submitting'}
                            className="w-full py-3.5 rounded-lg font-mono text-sm tracking-wider uppercase bg-gradient-to-r from-accent-purple to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {status === 'submitting' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</>
                            ) : (
                                <>🎁 Claim {bidData.allocation?.toLocaleString()} Tokens</>
                            )}
                        </button>
                    )}

                    {!isAuctionFinalized && (
                        <p className="text-xs text-white/30 font-mono">
                            ⏳ Allocation will be revealed when the auction ends
                        </p>
                    )}

                    <button
                        onClick={() => {
                            setBidData(null);
                            setAmount('');
                        }}
                        className="text-xs text-white/20 hover:text-white/50 transition-colors uppercase tracking-widest mt-4"
                    >
                        Close View
                    </button>
                </div>
            </div>
        );
    }

    // FORM VIEW
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
                            className="w-full bg-transparent border-b border-white/5 py-4 px-2 text-4xl font-display text-white/90 focus:outline-none focus:border-accent-purple/30 transition-all placeholder:text-white/5 no-spinner tracking-tight"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-white/10 tracking-widest pointer-events-none group-focus-within:text-accent-purple/40 transition-colors">USDC</span>

                        {/* Subtle Focus Glow */}
                        <div className="absolute inset-0 -z-10 bg-accent-purple/5 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500 rounded-lg"></div>
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
            </AnimatePresence>
        </>
    );

    return (
        <>
            {/* DESKTOP VIEW */}
            <div className="hidden md:block w-full max-w-sm mx-auto p-1">
                <div className="backdrop-blur-xl bg-[#0f021a]/60 rounded-xl p-8 relative overflow-hidden border border-white/5 shadow-2xl">
                    {formElements}
                </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden">
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

                <AnimatePresence>
                    {isMobileOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            />

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
