'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Vote, CheckCircle, XCircle, Clock, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GovernancePage() {
    const [hasVoted, setHasVoted] = useState(false);

    const handleVote = (vote: 'yes' | 'no') => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Signing Vote Transaction...',
                success: () => {
                    setHasVoted(true);
                    return `Vote Cast: ${vote === 'yes' ? 'Approve' : 'Reject'}`;
                },
                error: 'Failed to cast vote',
            }
        );
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-purple/10 blur-[120px] rounded-full pointer-events-none opacity-50"></div>

            <main className="container mx-auto px-6 py-24 relative z-10">
                {/* Header */}
                <div className="text-center mb-20 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <ShieldCheck className="w-3 h-3" /> DAO Control
                    </div>
                    <h1 className="text-5xl md:text-6xl font-display font-medium tracking-tight mb-6 text-glow text-[var(--foreground)]">
                        Governance
                    </h1>
                    <p className="text-lg text-enclave-muted max-w-2xl mx-auto font-light leading-relaxed">
                        Shape the future of Obsidian. Vote on protocol parameters, upgrades, and treasury allocation.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto">
                    {[
                        { label: "Treasury Value", value: "$4.2M", icon: <ShieldCheck className="w-5 h-5 text-accent-purple" /> },
                        { label: "Active Proposals", value: "1", icon: <Clock className="w-5 h-5 text-accent-purple" /> },
                        { label: "Total Members", value: "1,240", icon: <Users className="w-5 h-5 text-accent-purple" /> },
                    ].map((stat, i) => (
                        <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-accent-purple/20 transition-colors group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-display font-bold text-white group-hover:text-glow transition-all">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Active Proposals */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-display mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                        <span className="font-crypto text-sm tracking-[0.2em] text-[var(--foreground)]">ACTIVE_PROPOSALS</span>
                    </h2>

                    <div className="glass-panel rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-accent-purple/30 transition-all">
                        <div className="absolute top-0 right-0 p-4">
                            <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-mono rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                Voting Live
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-2xl font-display mb-2 text-white/90">OIP-1: Increase Max Allocation Cap</h3>
                            <p className="text-enclave-muted leading-relaxed text-sm">
                                Proposing to increase the per-user allocation cap from 1,000 OBS to 2,500 OBS to accommodate higher demand from institutional participants.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                            <div className="bg-white/5 rounded-lg p-4">
                                <span className="block text-[var(--muted)] mb-1 text-xs uppercase tracking-wider">For</span>
                                <span className="text-lg font-mono font-bold text-white">840K OBS (92%)</span>
                                <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-green-500 h-full w-[92%]"></div>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4">
                                <span className="block text-[var(--muted)] mb-1 text-xs uppercase tracking-wider">Against</span>
                                <span className="text-lg font-mono font-bold text-white">72K OBS (8%)</span>
                                <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-red-500 h-full w-[8%]"></div>
                                </div>
                            </div>
                        </div>

                        {hasVoted ? (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-3 text-green-400 font-mono text-sm">
                                <CheckCircle className="w-5 h-5" /> You have verified your vote on-chain.
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleVote('yes')}
                                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-green-500/10 border border-white/10 hover:border-green-500/30 text-white hover:text-green-400 transition-all font-mono uppercase tracking-widest text-sm flex items-center justify-center gap-2 group/btn"
                                >
                                    <CheckCircle className="w-4 h-4 opacity-50 group-hover/btn:opacity-100" /> Approve
                                </button>
                                <button
                                    onClick={() => handleVote('no')}
                                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white hover:text-red-400 transition-all font-mono uppercase tracking-widest text-sm flex items-center justify-center gap-2 group/btn"
                                >
                                    <XCircle className="w-4 h-4 opacity-50 group-hover/btn:opacity-100" /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
