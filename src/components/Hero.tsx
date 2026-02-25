'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, EyeOff, Lock, Fingerprint, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center min-h-[85vh] md:min-h-[70vh] text-center px-4 overflow-hidden w-full max-w-7xl mx-auto obsidian-noise pt-20">

            {/* Arcium Radial Glow Background */}
            <div className="absolute inset-0 arcium-radial pointer-events-none" />

            {/* Obsidian Shard Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9B6CFF]/20 to-transparent" />

            {/* Encrypted Enclave Orb */}
            <div className="absolute right-[-35%] top-[30%] md:right-[-5%] md:top-[45%] -translate-y-1/2 w-[500px] h-[500px] md:w-[850px] md:h-[850px] pointer-events-none z-0">
                {/* Outer Halo Glow — dual-tone */}
                <div className="absolute inset-0 rounded-full blur-[100px] md:blur-[140px] scale-125 animate-pulse"
                    style={{
                        animationDuration: '4s',
                        background: 'radial-gradient(circle, rgba(107, 63, 160, 0.2) 0%, rgba(106, 227, 255, 0.05) 60%, transparent 80%)'
                    }} />

                {/* Secondary Signal Glow */}
                <div className="absolute inset-[10%] bg-[#6AE3FF]/5 rounded-full blur-[80px] scale-110" />

                {/* The Dark Enclave Core */}
                <div className="absolute inset-6 bg-gradient-to-br from-[#050508] via-[#08060E] to-[#050508] rounded-full border border-[#9B6CFF]/10 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* Cryptographic Dot Matrix */}
                    <div className="absolute inset-0 opacity-15 md:opacity-25"
                        style={{
                            backgroundImage: 'radial-gradient(#9B6CFF 1px, transparent 1px)',
                            backgroundSize: '32px 32px'
                        }}
                    />

                    {/* Inner Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-transparent to-[#6B3FA0]/5" />

                    {/* Central Icon */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 1.2 }}
                        className="relative z-10 opacity-15 md:opacity-20"
                    >
                        <Fingerprint className="w-24 h-24 md:w-40 md:h-40 text-[#9B6CFF]" strokeWidth={0.4} />
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-30 flex flex-col items-start text-left gap-5 md:gap-7 max-w-2xl mr-auto pl-4 md:pl-12 mt-[-10vh] md:mt-0"
            >
                {/* Confidential Compute Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 px-4 py-2 rounded-md border border-[#6B3FA0]/30 bg-[#6B3FA0]/8 backdrop-blur-md"
                >
                    <span className="dot-encrypted pulse-signal" />
                    <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#C4A0FF]/80">
                        Confidential Compute
                    </span>
                    <Cpu className="w-3 h-3 text-[#6AE3FF] opacity-50" />
                </motion.div>

                {/* Main Heading — Sharp Typography */}
                <h1 className="font-display leading-[0.9] tracking-[-0.04em]">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="block text-5xl md:text-[6.5rem] font-bold text-frosted-chrome"
                    >
                        Obsidian
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.8 }}
                        className="block text-5xl md:text-[6.5rem] font-black text-volcanic-glass"
                        data-text="Launchpad."
                    >
                        Launchpad.
                    </motion.span>
                </h1>

                {/* Accent Line — Angular shard */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="h-[1px] w-20 md:w-36 origin-left bg-gradient-to-r from-[#6B3FA0] via-[#9B6CFF] to-transparent"
                />

                {/* Subtitle — better contrast */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-base md:text-lg text-[#9888B8] max-w-lg font-mono font-light tracking-tight leading-relaxed"
                >
                    Zero leaks. <span className="text-frosted-chrome font-medium">Verifiable.</span>
                    <br />
                    Secure execution inside the enclave.
                </motion.p>

                {/* Feature Pills — System-designed with consistent sizing */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 md:mt-4"
                >
                    <span className="btn-sweep flex items-center gap-2 text-[10px] md:text-[11px] text-white/50 font-mono tracking-[0.2em] uppercase h-9 px-4 rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white/70 hover:border-white/15 transition-all duration-300 cursor-default">
                        <EyeOff className="w-3.5 h-3.5 text-[#9B6CFF]/70" /> Private
                    </span>
                    <span className="btn-sweep flex items-center gap-2 text-[10px] md:text-[11px] text-white/50 font-mono tracking-[0.2em] uppercase h-9 px-4 rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white/70 hover:border-white/15 transition-all duration-300 cursor-default">
                        <Lock className="w-3.5 h-3.5 text-[#9B6CFF]/70" /> Encrypted
                    </span>
                    <Link
                        href="/governance"
                        className="btn-sweep flex items-center gap-2 text-[10px] md:text-[11px] text-[#9090a5] font-mono tracking-[0.2em] uppercase h-9 px-4 rounded-lg border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:text-[#c8c0d8] hover:border-white/15 transition-all duration-300"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> DAO Control
                    </Link>
                </motion.div>
            </motion.div>
        </section>
    );
}
