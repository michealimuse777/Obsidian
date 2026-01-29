'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 backdrop-blur-md bg-[#0B0E17]/60 border-b border-[#9B6CFF]/10 pointer-events-none">
            {/* Logo */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9B6CFF] to-[#6AE3FF] flex items-center justify-center font-bold text-black font-display text-lg shadow-[0_0_20px_rgba(155,108,255,0.4)]">
                    O
                </div>
                <span className="font-display font-semibold text-lg tracking-tight text-white/95">
                    OBSIDIAN
                </span>
            </div>

            {/* Wallet Button */}
            <div className="pointer-events-auto">
                <WalletMultiButton style={{
                    background: 'linear-gradient(135deg, rgba(155, 108, 255, 0.15) 0%, rgba(106, 227, 255, 0.08) 100%)',
                    border: '1px solid rgba(155, 108, 255, 0.3)',
                    borderRadius: '9999px',
                    fontFamily: 'var(--font-ibm-mono)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    height: 'auto',
                    padding: '0.6rem 1.25rem',
                    color: '#C2A8FF',
                    boxShadow: '0 0 20px rgba(155, 108, 255, 0.15)',
                    transition: 'all 0.3s ease'
                }} />
            </div>
        </header>
    );
}
