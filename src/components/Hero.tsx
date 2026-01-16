'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, EyeOff, Lock } from 'lucide-react';

export default function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center min-h-[85vh] md:min-h-[70vh] text-center px-4 overflow-hidden w-full max-w-7xl mx-auto">
            {/* 2. Reposition Glow & 1. Large Dark Circle (Mobile: Cropped & Mysterious) */}
            <div className="absolute right-[-45%] top-[25%] md:right-[-10%] md:top-[45%] -translate-y-1/2 w-[550px] h-[550px] md:w-[900px] md:h-[900px] pointer-events-none z-0">
                {/* The Glow (Behind) */}
                <div className="absolute inset-0 bg-accent-purple/10 rounded-full blur-[80px] md:blur-[100px] scale-110 opacity-40 md:opacity-60" />

                {/* The Dark Circle (Encrypted Environment) */}
                <div className="absolute inset-4 bg-[#080110] rounded-full border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* 5. Dot Matrix Overlay */}
                    <div className="absolute inset-0 opacity-15 md:opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(#a855f7 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-transparent to-black/80" />
                </div>
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-start text-left gap-6 md:gap-8 max-w-2xl mr-auto pl-4 md:pl-12 mt-[-10vh] md:mt-0"
            >
                <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 rounded-sm border border-white/5 bg-black/40 text-[9px] md:text-[10px] font-mono uppercase tracking-[0.15em] md:tracking-[0.2em] text-accent-purple/60 shadow-sm backdrop-blur-md">
                    <span className="w-1 h-1 rounded-full bg-accent-purple animate-pulse" />
                    Confidential Compute
                </div>

                {/* 4. Technical Typography (Mobile: Compressed & Quiet) */}
                <h1 className="text-5xl md:text-8xl font-normal tracking-[-0.04em] leading-[0.9] font-display text-white/50 md:text-white/90">
                    Dark<br />
                    Launchpad.
                </h1>

                <div className="h-px w-16 md:w-24 bg-gradient-to-r from-accent-purple/30 to-transparent my-1 md:my-2" />

                <p className="text-sm md:text-xl text-white/30 md:text-white/50 max-w-lg font-mono font-light tracking-tight leading-relaxed">
                    Zero leaks. Verifiable.<br />
                    Secure execution inside the enclave.
                </p>

                <div className="flex flex-wrap items-center gap-6 md:gap-8 mt-2 md:mt-4 text-[10px] md:text-xs text-white/20 font-mono tracking-widest uppercase">
                    <span className="flex items-center gap-2">
                        <EyeOff className="w-3 h-3" /> Private
                    </span>
                    <span className="flex items-center gap-2">
                        <Lock className="w-3 h-3" /> Encrypted
                    </span>
                </div>
            </motion.div>
        </section>
    );
}
