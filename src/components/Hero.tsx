'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, EyeOff, Lock, Fingerprint, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center min-h-[85vh] md:min-h-[70vh] text-center px-4 overflow-hidden w-full max-w-7xl mx-auto">

            {/* Arcium Radial Glow Background */}
            <div className="absolute inset-0 arcium-radial pointer-events-none" />

            {/* Encrypted Enclave Orb */}
            <div className="absolute right-[-35%] top-[30%] md:right-[-5%] md:top-[45%] -translate-y-1/2 w-[500px] h-[500px] md:w-[850px] md:h-[850px] pointer-events-none z-0">
                {/* Outer Halo Glow */}
                <div className="absolute inset-0 bg-[#9B6CFF]/15 rounded-full blur-[100px] md:blur-[140px] scale-125 animate-pulse"
                    style={{ animationDuration: '4s' }} />

                {/* Secondary Signal Glow */}
                <div className="absolute inset-[10%] bg-[#6AE3FF]/8 rounded-full blur-[80px] scale-110" />

                {/* The Dark Enclave Core */}
                <div className="absolute inset-6 bg-gradient-to-br from-[#0B0E17] via-[#0D0815] to-[#08050F] rounded-full border border-[#9B6CFF]/15 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* Cryptographic Dot Matrix */}
                    <div className="absolute inset-0 opacity-20 md:opacity-30"
                        style={{
                            backgroundImage: 'radial-gradient(#9B6CFF 1.5px, transparent 1.5px)',
                            backgroundSize: '28px 28px'
                        }}
                    />

                    {/* Inner Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-transparent to-[#9B6CFF]/5" />

                    {/* Central Icon */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 1.2 }}
                        className="relative z-10 opacity-20 md:opacity-30"
                    >
                        <Fingerprint className="w-24 h-24 md:w-40 md:h-40 text-[#9B6CFF]" strokeWidth={0.5} />
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
                    className="flex items-center gap-3 px-4 py-2 rounded-md border border-[#9B6CFF]/30 bg-[#9B6CFF]/10 backdrop-blur-md"
                >
                    <span className="dot-encrypted pulse-signal" />
                    <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-[#C2A8FF]">
                        Confidential Compute
                    </span>
                    <Cpu className="w-3 h-3 text-[#6AE3FF] opacity-60" />
                </motion.div>

                {/* Main Heading with Luminous Glow */}
                <h1 className="text-5xl md:text-8xl font-semibold tracking-[-0.03em] leading-[0.95] font-display text-glow">
                    <span className="text-white/95">Dark</span>
                    <br />
                    <span className="bg-gradient-to-r from-[#9B6CFF] via-[#C2A8FF] to-[#9B6CFF] bg-clip-text text-transparent">
                        Launchpad.
                    </span>
                </h1>

                {/* Accent Line */}
                <div className="h-[2px] w-20 md:w-32 bg-gradient-to-r from-[#9B6CFF] via-[#6AE3FF]/50 to-transparent" />

                {/* Subtitle */}
                <p className="text-base md:text-xl text-[#C2A8FF]/80 max-w-lg font-mono font-light tracking-tight leading-relaxed">
                    Zero leaks. <span className="text-[#6AE3FF]">Verifiable.</span>
                    <br />
                    Secure execution inside the enclave.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-2 md:mt-4">
                    <span className="flex items-center gap-2 text-[11px] md:text-xs text-white/60 font-mono tracking-widest uppercase px-3 py-1.5 rounded border border-white/10 bg-white/5">
                        <EyeOff className="w-3.5 h-3.5 text-[#9B6CFF]" /> Private
                    </span>
                    <span className="flex items-center gap-2 text-[11px] md:text-xs text-white/60 font-mono tracking-widest uppercase px-3 py-1.5 rounded border border-white/10 bg-white/5">
                        <Lock className="w-3.5 h-3.5 text-[#9B6CFF]" /> Encrypted
                    </span>
                    <Link
                        href="/governance"
                        className="flex items-center gap-2 text-[11px] md:text-xs text-[#6AE3FF] font-mono tracking-widest uppercase px-3 py-1.5 rounded border border-[#6AE3FF]/30 bg-[#6AE3FF]/10 hover:bg-[#6AE3FF]/20 transition-all"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> DAO Control
                    </Link>
                </div>
            </motion.div>
        </section>
    );
}
