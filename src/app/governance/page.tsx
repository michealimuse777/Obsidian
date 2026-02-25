'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ArrowLeft, Cpu, Zap, Users, Vote } from 'lucide-react';
import Link from 'next/link';

export default function GovernancePage() {
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-purple/10 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-[#6AE3FF]/5 blur-[100px] rounded-full pointer-events-none opacity-30"></div>

            <main className="container mx-auto px-6 py-24 relative z-10 flex flex-col items-center justify-center min-h-screen">
                {/* Back Link */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/80 transition-colors tracking-widest uppercase"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Link>

                {/* Coming Soon Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-lg w-full text-center"
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-mono tracking-widest uppercase mb-10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> DAO Control
                    </motion.div>

                    {/* Icon */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                        className="w-28 h-28 mx-auto mb-10 rounded-full bg-gradient-to-br from-accent-purple/10 to-[#6AE3FF]/5 border border-white/10 flex items-center justify-center relative shadow-[0_0_60px_rgba(168,85,247,0.15)]"
                    >
                        <Lock className="w-10 h-10 text-accent-purple/60" />
                        <div className="absolute inset-0 rounded-full animate-ping bg-accent-purple/5" style={{ animationDuration: '3s' }}></div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-4xl md:text-5xl font-display font-medium tracking-tight mb-4 text-glow"
                    >
                        Coming Soon
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-enclave-muted font-mono text-sm leading-relaxed max-w-md mx-auto mb-12"
                    >
                        On-chain governance powered by Arcium confidential voting.
                        <br />
                        <span className="text-[#6AE3FF]/70">Private ballots. Verifiable results. Zero leaks.</span>
                    </motion.p>

                    {/* Feature Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-12"
                    >
                        {[
                            { icon: <Vote className="w-4 h-4" />, label: "Encrypted Voting" },
                            { icon: <Users className="w-4 h-4" />, label: "Token-Weighted" },
                            { icon: <Cpu className="w-4 h-4" />, label: "MPC Tallying" },
                            { icon: <Zap className="w-4 h-4" />, label: "On-Chain Results" },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 + i * 0.1 }}
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-mono tracking-wider"
                            >
                                <span className="text-accent-purple/50">{feature.icon}</span>
                                {feature.label}
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-mono tracking-widest uppercase hover:bg-white/10 hover:text-white/90 hover:border-accent-purple/30 transition-all shadow-lg"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Launchpad
                        </Link>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
