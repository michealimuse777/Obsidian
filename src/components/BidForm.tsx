'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle, Wallet, ExternalLink } from 'lucide-react';
import { useProgram } from '@/hooks/useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { encryptBid, deriveArciumAccounts, waitForComputation } from '@/lib/arcium';

const getExplorerUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export default function BidForm() {
    const { program, provider } = useProgram();
    const { publicKey } = useWallet();

    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<'idle' | 'encrypting' | 'submitting' | 'computing' | 'success' | 'error'>('idle');
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

    const [hasBid, setHasBid] = useState(false);
    const [isCheckingBid, setIsCheckingBid] = useState(false);

    // Reset form state when wallet changes
    useEffect(() => {
        setStatus('idle');
        setAmount('');
        setTxHash('');
        setErrorMessage('');
        setBidData(null);
        setHasBid(false);
        setIsCheckingBid(true);
    }, [publicKey]);

    // Fetch Launch State & Check for Existing Bid
    useEffect(() => {
        if (!program || !publicKey) {
            setIsCheckingBid(false);
            return;
        }

        const init = async () => {
            try {
                // 1. Fetch Launch State
                const [launchPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("launch_v3")],
                    program.programId
                );

                let launchAccount = null;
                try {
                    launchAccount = await program.account.launch.fetchNullable(launchPda);
                } catch (e: any) {
                    console.error("Account fetch failed:", e);
                    setErrorMessage(`Launch Account Not Found (${process.env.NEXT_PUBLIC_NETWORK || 'devnet'}). Error: ${e.message}`);
                }

                if (launchAccount) {
                    setLaunchState(launchAccount as any);
                } else {
                    console.error("Launch Account is null (not found on-chain)");
                    setErrorMessage(`Launch V3 Not Found on ${process.env.NEXT_PUBLIC_NETWORK || 'devnet'}. Deploy the program first.`);
                }

                // 2. Check for Existing Bid
                const [bidPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bid_v3"), publicKey.toBuffer()],
                    program.programId
                );
                const existingBid = await program.account.bid.fetchNullable(bidPda);
                if (existingBid) {
                    const bidAccount = existingBid as any;
                    setHasBid(true);
                    setBidData({
                        txHash: "Registered",
                        allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                        isClaimed: bidAccount.isClaimed || false,
                        isProcessed: bidAccount.isProcessed || false,
                    });
                }
            } catch (err) {
                console.error("Error initializing BidForm:", err);
            } finally {
                setIsCheckingBid(false);
            }
        };

        init();
    }, [program, publicKey]);

    const isSubmittingRef = useRef(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !publicKey || !program || !launchState || !provider) return;
        if (status === 'encrypting' || status === 'submitting' || status === 'computing') return;
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;

        try {
            setErrorMessage('');

            // ═══════════════════════════════════════════════════
            // STEP 1: Encrypt bid using Arcium SDK
            // ═══════════════════════════════════════════════════
            setStatus('encrypting');

            const bidAmountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

            const encrypted = await encryptBid(
                bidAmountBigInt,
                provider,
                program.programId
            );

            // ═══════════════════════════════════════════════════
            // STEP 2: Derive all accounts
            // ═══════════════════════════════════════════════════
            setStatus('submitting');

            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch_v3")],
                program.programId
            );

            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid_v3"), publicKey.toBuffer()],
                program.programId
            );

            // Safety check: bid already exists?
            const existingBid = await program.account.bid.fetchNullable(bidPda);
            if (existingBid) {
                toast.success('Bid verified on-chain');
                const bidAccount = existingBid as any;
                setHasBid(true);
                setBidData({
                    txHash: "Verified",
                    allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                    isClaimed: bidAccount.isClaimed || false,
                    isProcessed: bidAccount.isProcessed || false,
                });
                isSubmittingRef.current = false;
                return;
            }

            // Generate random computation offset
            const computationOffsetBytes = Buffer.from(crypto.getRandomValues(new Uint8Array(8)));
            const computationOffset = new BN(computationOffsetBytes, "hex");

            // Derive Arcium accounts
            const arciumAccounts = await deriveArciumAccounts(
                program.programId,
                computationOffsetBytes,
                "verify_bid"
            );

            // Convert nonce to BN (u128)
            const nonceBN = new BN(
                Buffer.from(encrypted.nonce).toString("hex"),
                16
            );

            // ═══════════════════════════════════════════════════
            // STEP 3: Submit encrypted bid transaction
            // ═══════════════════════════════════════════════════
            const tx = await program.methods
                .submitEncryptedBid(
                    computationOffset,
                    Array.from(encrypted.ciphertext),
                    nonceBN,
                )
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    bidder: publicKey,
                    ...arciumAccounts,
                    systemProgram: SystemProgram.programId,
                })
                .rpc({ commitment: "confirmed" });

            console.log("Transaction Signature:", tx);
            setTxHash(tx);
            toast.success('Bid Encrypted & Submitted to Arcium', {
                action: { label: 'View Tx', onClick: () => window.open(getExplorerUrl(tx), '_blank') },
            });

            // ═══════════════════════════════════════════════════
            // STEP 4: Wait for MPC computation (with 60s timeout)
            // ═══════════════════════════════════════════════════
            setStatus('computing');
            toast.info('MPC computing...', { description: 'Arcium nodes are processing your bid confidentially.' });

            const MPC_TIMEOUT_MS = 60_000;
            const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), MPC_TIMEOUT_MS)
            );

            const finalizeSig = await Promise.race([
                waitForComputation(provider, computationOffsetBytes, program.programId),
                timeoutPromise,
            ]);

            setHasBid(true);
            setBidData({ txHash: tx, allocation: 0, isClaimed: false, isProcessed: false });
            setStatus('success');

            if (finalizeSig) {
                console.log("Computation finalized:", finalizeSig);
                toast.success('Bid processed by MPC!', {
                    action: { label: 'View Tx', onClick: () => window.open(getExplorerUrl(tx), '_blank') },
                });
            } else {
                console.log("MPC timeout — bid is on-chain, MPC processing in background");
                toast.success('Bid Submitted ✅', {
                    description: 'MPC processing in background. Your bid is safe on-chain.',
                    action: { label: 'View Tx', onClick: () => window.open(getExplorerUrl(tx), '_blank') },
                });
            }

            if (window.innerWidth < 768) {
                setTimeout(() => setIsMobileOpen(false), 2000);
            }

        } catch (err: any) {
            console.error("Bid Submission Error:", err);

            const errMsg = err.message || "";
            if (errMsg.includes("already been processed") || errMsg.includes("already in use") || errMsg.includes("simulation failed")) {
                try {
                    const [bidPda] = PublicKey.findProgramAddressSync([Buffer.from("bid_v3"), publicKey!.toBuffer()], program!.programId);
                    const existingBid = await program!.account.bid.fetchNullable(bidPda);
                    if (existingBid) {
                        toast.success('Bid already exists! Showing your bid.');
                        const bidAccount = existingBid as any;
                        setHasBid(true);
                        setBidData({
                            txHash: "Verified",
                            allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                            isClaimed: bidAccount.isClaimed || false,
                            isProcessed: bidAccount.isProcessed || false,
                        });
                        setStatus('success');
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

    // View existing bid
    const handleViewBid = async () => {
        if (!program || !publicKey) return;
        const [bidPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bid_v3"), publicKey.toBuffer()],
            program.programId
        );
        try {
            const existingBid = await program.account.bid.fetchNullable(bidPda);
            if (existingBid) {
                const bidAccount = existingBid as any;
                setBidData({
                    txHash: "Verified",
                    allocation: bidAccount.allocation ? (bidAccount.allocation as BN).toNumber() / 1_000_000 : 0,
                    isClaimed: bidAccount.isClaimed || false,
                    isProcessed: bidAccount.isProcessed || false,
                });
            }
        } catch (e) { console.error(e); }
    };

    // Loading State
    if ((!launchState && program && !bidData && !errorMessage) || (publicKey && isCheckingBid)) {
        return (
            <div className="w-full max-w-sm mx-auto p-8 backdrop-blur-xl bg-black/40 rounded-xl border border-white/5 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/30 mb-4" />
                <p className="text-xs font-mono text-white/50">
                    {isCheckingBid ? "Verifying eligibility..." : "Loading Launch State..."}
                </p>
            </div>
        );
    }

    // Launch State Error
    if (!launchState && !isCheckingBid && program && !bidData) {
        return (
            <div className="w-full max-w-sm mx-auto p-8 backdrop-blur-xl bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                <p className="text-xs font-mono text-red-200/70 mb-4">
                    Launch State Not Found
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-xs font-mono uppercase tracking-widest text-red-400 hover:text-red-300 border-b border-red-400/30"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Handle Claim
    const handleClaim = async () => {
        if (!program || !publicKey || !launchState) return;

        try {
            setStatus('submitting');

            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch_v3")],
                program.programId
            );
            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid_v3"), publicKey.toBuffer()],
                program.programId
            );

            const userAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID
            );

            // Check if User ATA exists, create if not
            try {
                await spl.getAccount(program.provider.connection, userAta);
            } catch (e) {
                console.log("Creating User ATA...");
                const createAtaTx = new (await import('@solana/web3.js')).Transaction().add(
                    spl.createAssociatedTokenAccountInstruction(
                        publicKey,
                        userAta,
                        publicKey,
                        launchState.mint
                    )
                );
                const signature = await program.provider.sendAndConfirm(createAtaTx);
                toast.success("Created Token Account");
            }

            const CLAIM_TIMEOUT_MS = 30_000;
            const claimPromise = (program.methods as any)
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

            const claimTimeout = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), CLAIM_TIMEOUT_MS)
            );

            const tx = await Promise.race([claimPromise, claimTimeout]);

            if (tx) {
                toast.success('Tokens Claimed!', { description: `Tx: ${(tx as string).slice(0, 8)}...` });
                setBidData(prev => prev ? { ...prev, isClaimed: true } : null);
            } else {
                toast.success('Claim submitted ✅', { description: 'Confirming in background. Refresh to check status.' });
            }
            setStatus('success');
        } catch (err: any) {
            console.error("Claim error:", err);
            toast.error('Claim Failed', { description: err.message });
            setStatus('error');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD VIEW (If Bid Exists)
    // ═══════════════════════════════════════════════════════════
    if (bidData) {
        const isAuctionFinalized = launchState?.isFinalized || false;
        const hasAllocation = (bidData.allocation || 0) > 0;
        const canClaim = isAuctionFinalized && hasAllocation && !bidData.isClaimed;
        const displayAllocation = bidData.allocation && bidData.allocation > 0 ? bidData.allocation : 0;
        const isPending = !isAuctionFinalized && !bidData.isClaimed;

        return (
            <div className="w-full max-w-sm mx-auto p-1 relative z-10">
                <div className="absolute -inset-12 rounded-full pointer-events-none opacity-30"
                    style={{ background: 'radial-gradient(circle, rgba(107, 63, 160, 0.3) 0%, rgba(106, 227, 255, 0.05) 50%, transparent 70%)' }} />

                <div className="glass-panel rounded-2xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden obsidian-noise">
                    {/* Angular shard accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9B6CFF]/30 to-transparent" />

                    {/* Status Icon with pulse ring */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ${isPending ? 'pulse-ring' : ''} ${bidData.isClaimed
                            ? 'bg-green-500/10 ring-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]'
                            : hasAllocation
                                ? 'bg-[#6B3FA0]/15 ring-[#9B6CFF]/30 shadow-[0_0_30px_rgba(107,63,160,0.2)]'
                                : 'bg-white/[0.03] ring-white/8 shadow-[0_0_40px_rgba(0,0,0,0.3)]'
                            }`}>
                        {bidData.isClaimed ? (
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        ) : hasAllocation ? (
                            <span className="text-3xl">🎉</span>
                        ) : (
                            <Lock className="w-8 h-8 text-[#9B6CFF]/40" />
                        )}
                    </motion.div>

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <h3 className="text-2xl font-display font-bold text-white mb-2 tracking-[-0.02em]">
                            {bidData.isClaimed ? 'Tokens Claimed!' : hasAllocation ? 'You Won!' : 'Bid Registered'}
                        </h3>
                        <p className="text-xs font-mono text-[#9888B8] uppercase tracking-[0.2em]">
                            {isAuctionFinalized
                                ? (bidData.isClaimed ? 'Claimed Successfully' : 'Auction Complete')
                                : 'MPC Processing...'}
                        </p>
                    </motion.div>

                    {/* Details Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="p-5 rounded-xl bg-black/30 border border-white/[0.04] space-y-4 text-left relative"
                    >
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                        {bidData.txHash && bidData.txHash !== "Registered" && bidData.txHash !== "Verified" && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[#6A5A8A] font-mono text-xs">Transaction</span>
                                <a
                                    href={getExplorerUrl(bidData.txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#6AE3FF]/70 font-mono text-xs flex items-center gap-1.5 hover:text-[#6AE3FF] transition-colors duration-300"
                                >
                                    {bidData.txHash.slice(0, 8)}...{bidData.txHash.slice(-4)}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#6A5A8A] font-mono text-xs">Bid Amount</span>
                            <span className="text-[#C4A0FF] font-mono flex items-center gap-2 text-xs font-semibold">
                                <Lock className="w-3 h-3" /> Encrypted (Arcium MPC)
                            </span>
                        </div>

                        {bidData.isProcessed && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[#6A5A8A] font-mono text-xs">Allocation</span>
                                <span className={`font-mono font-bold text-base ${hasAllocation ? 'text-green-400' : 'text-[#6A5A8A]'}`}>
                                    {hasAllocation ? `${displayAllocation.toLocaleString()} OBS` : 'Pending...'}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#6A5A8A] font-mono text-xs">Privacy</span>
                            <span className="font-mono text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-widest bg-[#6AE3FF]/8 text-[#6AE3FF]/80 border border-[#6AE3FF]/10">
                                ARCIUM MPC
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#6A5A8A] font-mono text-xs">Status</span>
                            <span className={`font-mono text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-widest ${bidData.isClaimed
                                ? 'bg-green-500/10 text-green-400/80 border border-green-500/15'
                                : isAuctionFinalized
                                    ? 'bg-[#9B6CFF]/10 text-[#C4A0FF] border border-[#9B6CFF]/15'
                                    : 'bg-yellow-500/8 text-yellow-300/80 border border-yellow-500/10'
                                }`}>
                                {bidData.isClaimed ? 'CLAIMED' : isAuctionFinalized ? 'READY' : 'PENDING'}
                            </span>
                        </div>
                    </motion.div>

                    {/* Claim Button */}
                    {canClaim && (
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            onClick={handleClaim}
                            disabled={status === 'submitting'}
                            className="btn-sweep w-full py-4 rounded-xl font-mono text-xs font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-[#6B3FA0] to-[#9B6CFF] text-white hover:shadow-[0_0_30px_rgba(107,63,160,0.3)] transition-all duration-400 disabled:opacity-50 flex items-center justify-center gap-2 border border-[#9B6CFF]/20"
                        >
                            {status === 'submitting' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</>
                            ) : (
                                <>🎁 Claim {displayAllocation.toLocaleString()} Tokens</>
                            )}
                        </motion.button>
                    )}

                    {!isAuctionFinalized && (
                        <p className="text-xs text-purple-200/40 font-mono">
                            ⏳ Arcium MPC is processing allocations confidentially
                        </p>
                    )}

                    <button
                        onClick={() => {
                            setBidData(null);
                            setAmount('');
                            setStatus('idle');
                        }}
                        className="text-xs text-purple-200/30 hover:text-white transition-colors uppercase tracking-widest mt-6"
                    >
                        Close View
                    </button>
                </div>
            </div >
        );
    }

    // ═══════════════════════════════════════════════════════════
    // FORM VIEW
    // ═══════════════════════════════════════════════════════════
    const formElements = (
        <>
            <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#9888B8]/60 mb-8 flex items-center justify-between uppercase">
                <span>{hasBid ? 'Existing Bid Found' : 'Confidential Input'}</span>
                <span className={`w-2 h-2 rounded-full ${hasBid ? 'bg-[#9B6CFF] shadow-[0_0_12px_rgba(155,108,255,0.6)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]'}`}></span>
            </h3>

            <form onSubmit={hasBid ? (e) => { e.preventDefault(); handleViewBid(); } : handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <div className="relative group">
                        <input
                            type="number"
                            value={hasBid ? '' : amount}
                            onChange={(e) => { setAmount(e.target.value); if (status === 'success') setStatus('idle'); }}
                            placeholder={hasBid ? "Bid Placed" : "0.00"}
                            disabled={status === 'encrypting' || status === 'submitting' || status === 'computing' || hasBid}
                            className={`w-full bg-transparent border-b border-white/[0.06] py-5 px-2 text-5xl font-display font-bold text-white focus:outline-none focus:border-[#9B6CFF]/40 transition-all duration-300 placeholder:text-white/[0.06] no-spinner tracking-[-0.02em] ${hasBid ? 'opacity-50 cursor-not-allowed text-center placeholder:text-[#9B6CFF]/40' : ''}`}
                        />
                        {!hasBid && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#6A5A8A]/50 tracking-[0.2em] pointer-events-none group-focus-within:text-[#9B6CFF]/60 transition-colors duration-300">USDC</span>}

                        <div className="absolute inset-0 -z-10 bg-[#6B3FA0]/5 opacity-0 group-focus-within:opacity-100 blur-2xl transition-opacity duration-500 rounded-lg"></div>
                    </div>
                </div>

                {!publicKey ? (
                    <div className="p-5 rounded-xl border border-yellow-500/10 bg-yellow-500/[0.03] text-yellow-300/60 text-xs font-mono text-center">
                        <Wallet className="w-5 h-5 mx-auto mb-2 opacity-60" />
                        Connect wallet to bid
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={status === 'encrypting' || status === 'submitting' || status === 'computing' || (!amount && !hasBid)}
                        className={`btn-sweep w-full py-4 rounded-xl font-mono text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all duration-400 relative overflow-hidden
                        ${hasBid ? 'bg-[#9B6CFF]/8 text-[#C4A0FF] border border-[#9B6CFF]/20 hover:bg-[#9B6CFF]/12 hover:shadow-[0_0_20px_rgba(155,108,255,0.15)]' :
                                status === 'success' ? 'bg-green-500/8 text-green-400/80 border border-green-500/15 hover:bg-green-500/12' :
                                    status === 'error' ? 'bg-red-500/8 text-red-400/80 border border-red-500/15' :
                                        'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/80 hover:text-white hover:border-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]'}
                        disabled:opacity-40 disabled:cursor-not-allowed
                        `}
                    >
                        {hasBid ? (
                            <>
                                View My Bid <ArrowRight className="w-4 h-4" />
                            </>
                        ) : status === 'idle' ? (
                            <>
                                Encrypt & Submit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        ) : status === 'error' ? (
                            <>
                                Retry <ArrowRight className="w-4 h-4" />
                            </>
                        ) : status === 'encrypting' ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Encrypting via Arcium...</span>
                        ) : status === 'submitting' ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Submitting to MPC...</span>
                        ) : status === 'computing' ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> MPC Computing...</span>
                        ) : (
                            <span className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Registered</span>
                        )}

                        <AnimatePresence>
                            {(status === 'encrypting' || status === 'submitting' || status === 'computing') && (
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: status === 'computing' ? 10 : 3.5, ease: "linear" }}
                                    className="absolute bottom-0 left-0 h-0.5 bg-accent-purple box-shadow-[0_0_10px_#a855f7]"
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
                        className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono break-all shadow-inner"
                    >
                        {errorMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return (
        <>
            <div className="hidden md:block w-full max-w-sm mx-auto p-1 relative z-10">
                <div className="absolute -inset-2 z-[-1] rounded-full opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(107, 63, 160, 0.3) 0%, rgba(106, 227, 255, 0.05) 50%, transparent 70%)' }} />

                <div className="glass-panel rounded-2xl p-10 relative overflow-hidden shadow-2xl obsidian-noise">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9B6CFF]/20 to-transparent" />
                    {formElements}
                </div>
            </div>

            <div className="md:hidden">
                {!isMobileOpen && (
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => setIsMobileOpen(true)}
                        className="fixed bottom-8 left-6 right-6 h-16 bg-[var(--card-bg)]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-between px-8 text-white font-mono text-sm uppercase tracking-widest shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-white/10 transition-all z-40"
                    >
                        <span>Secure Input</span>
                        <Lock className="w-5 h-5 text-accent-purple" />
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
                                className="fixed inset-0 bg-[#0a0210]/80 backdrop-blur-sm z-50"
                            />

                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 rounded-t-[2.5rem] p-6 pb-8 z-50 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto"
                            >
                                <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                                {formElements}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
