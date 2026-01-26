'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle, Wallet } from 'lucide-react';
import { useProgram } from '@/hooks/useProgram';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Transaction, SendTransactionError } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
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

    // NEW: Persistent state for existing bid
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

    const handleInitialize = async () => {
        if (!program || !publicKey) return;
        setStatus('submitting');
        try {
            console.log("Initializing Launch...");
            // 1. Create a fresh Mint for this Launch
            const mintKeypair = Keypair.generate();
            const lamports = await program.provider.connection.getMinimumBalanceForRentExemption(spl.MINT_SIZE);

            const createMintTx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: spl.MINT_SIZE,
                    lamports,
                    programId: spl.TOKEN_PROGRAM_ID,
                }),
                spl.createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    6,
                    publicKey,
                    publicKey,
                    spl.TOKEN_PROGRAM_ID
                )
            );

            // Send Mint Creation Tx
            const sig = await program.provider.sendAndConfirm(createMintTx, [mintKeypair]);
            console.log("Mint Created:", mintKeypair.publicKey.toBase58());

            // 2. Derive PDAs
            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch_v2")],
                program.programId
            );
            const launchPool = await spl.getAssociatedTokenAddress(
                mintKeypair.publicKey,
                launchPda,
                true
            );

            // 3. Call Initialize
            const totalTokens = new BN(1_000_000_000_000); // 1M tokens
            const maxAllocation = new BN(5_000_000_000);   // 5k tokens

            const tx = await program.methods
                .initializeLaunch(totalTokens, maxAllocation)
                .accounts({
                    launch: launchPda,
                    mint: mintKeypair.publicKey,
                    launchPool: launchPool,
                    authority: publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
                })
                .rpc();

            console.log("Initialization Signature:", tx);
            toast.success('Launch Initialized!');

            // Refresh State
            setTimeout(() => window.location.reload(), 2000);

        } catch (err) {
            console.error("Init Error:", err);
            toast.error("Initialization Failed: " + (err as Error).message);
            setStatus('idle');
        }
    };

    // Initial Check for Existing Bid & Fetch Launch State
    useEffect(() => {
        if (!program || !publicKey) {
            setIsCheckingBid(false);
            return;
        }

        const init = async () => {
            const DEMO_MODE = false; // REAL MODE - Deployed!

            try {
                // 1. Fetch Launch State
                const [launchPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("launch_v2")],
                    program.programId
                );

                let launchAccount = null;
                try {
                    launchAccount = await program.account.launch.fetchNullable(launchPda);
                } catch (e) { console.log("Account fetch failed, might need init"); }

                if (launchAccount) {
                    setLaunchState(launchAccount as any);
                } else {
                    // Not initialized yet - Ready for User Init
                    console.log("Launch not initialized.");
                }

                // 2. Check for Existing Bid
                const [bidPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bid_v2"), publicKey.toBuffer()],
                    program.programId
                );
                const existingBid = await program.account.bid.fetchNullable(bidPda);
                if (existingBid) {
                    // ... existing logic ...
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
        if (!amount || !publicKey || !program || !launchState) return;
        if (status === 'encrypting' || status === 'submitting') return;
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;

        try {
            setErrorMessage('');
            const DEMO_MODE = false;

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
                [Buffer.from("launch_v1")],
                program.programId
            );

            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid_v2"), publicKey.toBuffer()],
                program.programId
            );

            // Safety Check
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

            // User's ATA
            const fromAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID
            );

            const toAta = launchState.launchPool;

            // Check if User has USDC Account
            const fromAccountInfo = await program.provider.connection.getAccountInfo(fromAta);
            if (!fromAccountInfo && !DEMO_MODE) {
                toast.error("No USDC Account Found", {
                    description: "You need USDC to place a bid. Please swap SOL for USDC in your wallet first."
                });
                isSubmittingRef.current = false;
                setStatus('idle');
                return;
            }

            // 3. Send Transaction
            let tx = "Simulated_Tx_Hash_For_Demo_" + Math.random().toString(36).substring(7);

            if (!DEMO_MODE) {
                tx = await program.methods
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
            } else {
                await new Promise(r => setTimeout(r, 2000)); // Simulate detailed RPC confirmation
            }

            console.log("Transaction Signature:", tx);
            toast.success('Bid Encrypted & Submitted');

            setHasBid(true);
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
                    const [bidPda] = PublicKey.findProgramAddressSync([Buffer.from("bid_v2"), publicKey!.toBuffer()], program!.programId);
                    const existingBid = await program!.account.bid.fetchNullable(bidPda);
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

    // Helper to Restore View
    const handleViewBid = async () => {
        if (!program || !publicKey) return;
        const [bidPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bid_v2"), publicKey.toBuffer()],
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
    if (isCheckingBid) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400">Loading Protocol State...</p>
            </div>
        );
    }

    if (!launchState) {
        return (
            <div className="text-center py-12 space-y-6">
                <div className="p-4 bg-indigo-500/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-200">Protocol Not Initialized</h3>
                    <p className="text-slate-400 mt-2">Deploy complete. Ready to bootstrap.</p>
                </div>
                <button
                    onClick={handleInitialize}
                    disabled={status !== 'idle'}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                    {status === 'submitting' ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        'Initialize Protocol'
                    )}
                </button>
            </div>
        );
    }

    // Handle Claim
    const handleClaim = async () => {
        const DEMO_MODE = false;

        if (DEMO_MODE) {
            setStatus('submitting');
            await new Promise(r => setTimeout(r, 1500)); // Simulate tx
            toast.success('Tokens Claimed! (Simulated)', { description: `Tx: 3xP4...Demo` });
            setBidData(prev => prev ? { ...prev, isClaimed: true } : null);
            setStatus('success');
            return;
        }

        if (!program || !publicKey || !launchState) return;

        try {
            setStatus('submitting');

            const [launchPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("launch_v2")],
                program.programId
            );
            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid_v2"), publicKey.toBuffer()],
                program.programId
            );

            const userAta = await spl.getAssociatedTokenAddress(
                launchState.mint,
                publicKey,
                false,
                spl.TOKEN_PROGRAM_ID
            );

            // Check if User ATA exists
            try {
                await spl.getAccount(program.provider.connection, userAta);
            } catch (e) {
                // If not found, create it
                console.log("Creating User ATA...");
                const createAtaTx = new Transaction().add(
                    spl.createAssociatedTokenAccountInstruction(
                        publicKey, // payer
                        userAta,   // ata
                        publicKey, // owner
                        launchState.mint // mint
                    )
                );

                // Send creation tx
                const signature = await program.provider.sendAndConfirm(createAtaTx);
                toast.success("Created Token Account");
            }

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
        const DEMO_MODE = false;
        const isAuctionFinalized = DEMO_MODE || launchState?.isFinalized || false;
        const hasAllocation = DEMO_MODE || (bidData.allocation || 0) > 0;
        const canClaim = isAuctionFinalized && hasAllocation && !bidData.isClaimed;
        const displayAllocation = bidData.allocation && bidData.allocation > 0 ? bidData.allocation : 50000;

        return (
            <div className="w-full max-w-sm mx-auto p-1 relative z-10">
                {/* Radial Glow Effect */}
                <div className="absolute -inset-10 bg-accent-purple/20 blur-[100px] rounded-full pointer-events-none opacity-40"></div>

                <div className="glass-panel rounded-2xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">

                    {/* Status Icon */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 shadow-[0_0_40px_rgba(0,0,0,0.3)] ${bidData.isClaimed
                        ? 'bg-green-500/10 ring-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : hasAllocation
                            ? 'bg-accent-purple/10 ring-accent-purple/40 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 ring-white/10'
                        }`}>
                        {bidData.isClaimed ? (
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        ) : hasAllocation ? (
                            <span className="text-3xl">🎉</span>
                        ) : (
                            <Lock className="w-8 h-8 text-purple-200/50" />
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <h3 className="text-2xl font-display text-white mb-2 tracking-tight">
                            {bidData.isClaimed ? 'Tokens Claimed!' : hasAllocation ? 'You Won!' : 'Bid Registered'}
                        </h3>
                        <p className="text-sm font-mono text-purple-200/70 uppercase tracking-widest">
                            {isAuctionFinalized
                                ? (bidData.isClaimed ? 'Claimed Successfully' : 'Auction Complete')
                                : 'Auction In Progress'}
                        </p>
                    </div>

                    {/* Details Card */}
                    <div className="p-5 rounded-xl bg-black/20 border border-white/5 space-y-4 text-left shadow-inner">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-purple-200/60 font-mono">Bid Amount</span>
                            <span className="text-accent-purple font-mono flex items-center gap-2 font-bold">
                                <Lock className="w-3.5 h-3.5" /> Encrypted
                            </span>
                        </div>

                        {(bidData.isProcessed || DEMO_MODE) && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-purple-200/60 font-mono">Allocation</span>
                                <span className={`font-mono font-bold text-lg ${hasAllocation ? 'text-green-400' : 'text-purple-200/50'}`}>
                                    {hasAllocation ? `${displayAllocation.toLocaleString()} OBS` : 'Pending...'}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-purple-200/60 font-mono">Status</span>
                            <span className={`font-mono text-xs px-2.5 py-1 rounded-md font-bold tracking-wide ${bidData.isClaimed
                                ? 'bg-green-500/20 text-green-300'
                                : isAuctionFinalized
                                    ? 'bg-accent-purple/20 text-accent-purple'
                                    : 'bg-yellow-500/10 text-yellow-300'
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
                            className="w-full py-4 rounded-xl font-mono text-sm font-bold tracking-widest uppercase bg-gradient-to-r from-accent-purple to-purple-600 text-white hover:opacity-90 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {status === 'submitting' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</>
                            ) : (
                                <>🎁 Claim {displayAllocation.toLocaleString()} Tokens</>
                            )}
                        </button>
                    )}

                    {!isAuctionFinalized && (
                        <p className="text-xs text-purple-200/40 font-mono">
                            ⏳ Allocation will be revealed when the auction ends
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
            </div>
        );
    }

    // FORM VIEW
    const formElements = (
        <>
            <h3 className="text-sm font-mono tracking-widest text-purple-200/60 mb-8 flex items-center justify-between uppercase">
                <span>{hasBid ? 'Existing Bid Found' : 'Confidential Input'}</span>
                <span className={`w-2 h-2 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)] ${hasBid ? 'bg-accent-purple' : 'bg-green-500'}`}></span>
            </h3>

            <form onSubmit={hasBid ? (e) => { e.preventDefault(); handleViewBid(); } : handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <div className="relative group">
                        <input
                            type="number"
                            value={hasBid ? '' : amount}
                            onChange={(e) => { setAmount(e.target.value); if (status === 'success') setStatus('idle'); }}
                            placeholder={hasBid ? "Bid Placed" : "0.00"}
                            disabled={status === 'encrypting' || status === 'submitting' || hasBid}
                            className={`w-full bg-transparent border-b border-purple-200/10 py-5 px-2 text-5xl font-display text-white focus:outline-none focus:border-accent-purple/50 transition-all placeholder:text-purple-200/10 no-spinner tracking-tight ${hasBid ? 'opacity-50 cursor-not-allowed text-center placeholder:text-accent-purple/60' : ''}`}
                        />
                        {!hasBid && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-purple-200/30 tracking-widest pointer-events-none group-focus-within:text-accent-purple transition-colors">USDC</span>}

                        <div className="absolute inset-0 -z-10 bg-accent-purple/5 opacity-0 group-focus-within:opacity-100 blur-2xl transition-opacity duration-500 rounded-lg"></div>
                    </div>
                </div>

                {!publicKey ? (
                    <div className="p-5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-200/70 text-sm font-mono text-center shadow-[0_0_20px_rgba(234,179,8,0.05)]">
                        <Wallet className="w-5 h-5 mx-auto mb-2 opacity-80" />
                        Please connect wallet to bid
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={status === 'encrypting' || status === 'submitting' || (!amount && !hasBid)}
                        className={`w-full py-4 rounded-lg font-mono text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden shadow-lg
                        ${hasBid ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/25 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]' :
                                status === 'success' ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25' :
                                    status === 'error' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                        'bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                        disabled:opacity-50 disabled:cursor-not-allowed
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
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Encrypting...</span>
                        ) : status === 'submitting' ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</span>
                        ) : (
                            <span className="flex items-center gap-2"><CheckCircle className="w-3 h-3" /> Registered</span>
                        )}

                        <AnimatePresence>
                            {(status === 'encrypting' || status === 'submitting') && (
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 3.5, ease: "linear" }}
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
                {/* Desktop Glow Behind Card */}
                <div className="absolute -inset-1 z-[-1] bg-gradient-to-b from-accent-purple/20 to-transparent blur-3xl opacity-30 rounded-full"></div>

                <div className="glass-panel rounded-2xl p-10 relative overflow-hidden shadow-2xl border border-white/10">
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
                                className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 rounded-t-[2.5rem] p-8 pb-12 z-50 shadow-[0_-10px_50px_rgba(0,0,0,0.8)]"
                            >
                                <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-10" />
                                {formElements}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
