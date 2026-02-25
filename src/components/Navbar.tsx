'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-[#050508]/70 border-b border-white/[0.04] pointer-events-none">
            {/* Logo */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-black font-display text-sm"
                    style={{
                        background: 'linear-gradient(135deg, #6B3FA0, #9B6CFF, #6AE3FF)',
                        boxShadow: '0 0 20px rgba(107, 63, 160, 0.4), 0 0 40px rgba(155, 108, 255, 0.15)',
                    }}>
                    O
                </div>
                <span className="font-display font-bold text-base tracking-[-0.02em] text-white/90">
                    OBSIDIAN
                </span>
            </div>

            {/* Wallet Button */}
            <div className="pointer-events-auto">
                <WalletMultiButton style={{
                    background: 'rgba(8, 6, 14, 0.8)',
                    border: '1px solid rgba(155, 108, 255, 0.15)',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-ibm-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.06em',
                    height: 'auto',
                    padding: '0.55rem 1.1rem',
                    color: '#C4A0FF',
                    boxShadow: '0 0 30px rgba(107, 63, 160, 0.1)',
                    transition: 'all 0.4s ease',
                    backdropFilter: 'blur(12px)',
                }} />
            </div>
        </header>
    );
}
